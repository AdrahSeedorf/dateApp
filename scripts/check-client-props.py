#!/usr/bin/env python3
"""
Catches functions passed from a server component into a client one.

Next.js serialises props across that boundary, and an ordinary function
can't be serialised. The failure mode is the worst kind available: it
typechecks, it lints clean, and it throws the first time the page renders —

    Functions cannot be passed directly to Client Components

which is how `<CountUp format={formatCount} />` got written here. The helper
was one line, the prop was correctly typed, and nothing objected until the
dashboard was opened.

THE EXCEPTION THAT MAKES THIS WORTH WRITING CAREFULLY. Server Actions are
functions and they are legal to pass — that's how every form in this app
works. A check that flags them is a check that reports eleven problems on a
working codebase and gets ignored by the second week. So a function prop is
only a failure when the thing being passed is *not* a Server Action:

  * an inline arrow or function expression        — always wrong
  * an identifier imported from a "use server"
    module                                        — fine, that's an action
  * anything else                                 — wrong

    python3 scripts/check-client-props.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEARCH = ["app", "components"]

USE_CLIENT = re.compile(r"""^\s*['"]use client['"]""", re.M)
USE_SERVER = re.compile(r"""^\s*['"]use server['"]""", re.M)
PROPS_BLOCK = re.compile(r"\btype\s+\w*Props\w*\s*=\s*\{", re.M)
FIELD = re.compile(r"^\s{2}(\w+)\??\s*:\s*(.+?)(?=^\s{2}\w+\??\s*:|\Z)", re.M | re.S)
IDENTIFIER = re.compile(r"^[A-Za-z_$][\w$]*$")


def source_files() -> list[Path]:
    files: list[Path] = []
    for folder in SEARCH:
        files.extend((ROOT / folder).rglob("*.tsx"))
    return sorted(files)


def strip_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return re.sub(r"//[^\n]*", "", text)


def balanced(text: str, start: int, open_ch: str, close_ch: str) -> str:
    """Contents between a matching pair, starting at `start` (the opener)."""
    depth = 0
    for i in range(start, len(text)):
        if text[i] == open_ch:
            depth += 1
        elif text[i] == close_ch:
            depth -= 1
            if depth == 0:
                return text[start + 1 : i]
    return ""


def read_tag(text: str, start: int) -> str:
    """
    A JSX opening tag's attributes, from just after the component name.

    Can't just scan to the first `>`: an inline arrow contains one, and
    stopping there truncates the very value this check exists to inspect.
    So `>` only ends the tag at brace depth zero.
    """
    depth = 0
    for i in range(start, len(text)):
        char = text[i]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
        elif char == ">" and depth == 0:
            return text[start:i]

    return text[start:]


def props_block(text: str) -> str:
    match = PROPS_BLOCK.search(text)
    if not match:
        return ""
    return balanced(text, match.end() - 1, "{", "}")


def function_props(text: str) -> set[str]:
    """
    Prop names declared as functions.

    Only the annotation is trusted. A name-based rule (`on[A-Z]`) looked
    tempting and immediately misfired on `onRequest: boolean`.
    """
    names: set[str] = set()

    for name, annotation in FIELD.findall(props_block(text)):
        if "=>" in strip_comments(annotation):
            names.add(name)

    return names


def inline_server_actions(text: str) -> set[str]:
    """
    Actions declared in this file with a "use server" directive in the body.

    `app/welcome/page.tsx` does exactly this so its steps can close over the
    current step. They look like ordinary local functions, which is the
    whole reason this needs stating explicitly.
    """
    return {
        match.group(1)
        for match in re.finditer(
            r"""(?:async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{\s*['"]use server['"]""",
            text,
        )
    } | {
        match.group(1)
        for match in re.finditer(
            r"""const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{\s*['"]use server['"]""",
            text,
        )
    }


def server_action_imports(text: str, path: Path) -> set[str]:
    """Names this file imports from a "use server" module."""
    actions: set[str] = set()

    for match in re.finditer(
        r"import\s*\{([^}]*)\}\s*from\s*['\"]([^'\"]+)['\"]", text
    ):
        names, source = match.group(1), match.group(2)

        if source.startswith("@/"):
            base = ROOT / source[2:]
        elif source.startswith("."):
            base = (path.parent / source).resolve()
        else:
            continue

        for candidate in (
            base.with_suffix(".ts"),
            base.with_suffix(".tsx"),
            base / "index.ts",
        ):
            if candidate.exists() and USE_SERVER.search(candidate.read_text()):
                for name in names.split(","):
                    clean = name.split(" as ")[-1].strip()
                    if clean:
                        actions.add(clean)
                break

    return actions


def main() -> int:
    clients: dict[str, tuple[Path, set[str]]] = {}
    servers: list[tuple[Path, str]] = []

    for path in source_files():
        text = path.read_text()

        if USE_CLIENT.search(text):
            props = function_props(text)
            if props:
                clients[component_name := path.stem] = (path, props)
                del component_name
        else:
            servers.append((path, text))

    problems: list[str] = []
    checked = 0

    for path, text in servers:
        actions = server_action_imports(text, path) | inline_server_actions(text)

        for name, (client_path, props) in clients.items():
            if not re.search(rf"\bimport\s+[^;]*\b{name}\b[^;]*from", text):
                continue

            for usage in re.finditer(rf"<{name}(?=[\s/>])", text):
                tag = read_tag(text, usage.end())

                for prop in sorted(props):
                    attr = re.search(rf"\b{prop}\s*=\s*\{{", tag)
                    if not attr:
                        continue

                    checked += 1
                    value = balanced(tag, attr.end() - 1, "{", "}").strip()

                    if IDENTIFIER.match(value) and value in actions:
                        continue  # A Server Action. Legal, and the norm here.

                    line = text[: usage.start()].count("\n") + 1
                    why = (
                        "an inline function"
                        if ("=>" in value or value.startswith("function"))
                        else f"`{value}`, which isn't a Server Action"
                    )
                    problems.append(
                        f"  {path.relative_to(ROOT)}:{line}\n"
                        f"    <{name} {prop}={{…}}> passes {why}.\n"
                        f"    {name} is a client component "
                        f"({client_path.relative_to(ROOT)}), so this throws at\n"
                        f"    render. Move the call inside {name}, or make it a "
                        f"Server Action."
                    )

    if problems:
        print(f"FAIL  {len(problems)} function prop(s) crossing into a client component\n")
        print("\n\n".join(problems))
        return 1

    print(
        f"PASS  no non-action function crosses into a client component "
        f"({checked} function props checked across {len(clients)} components)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
