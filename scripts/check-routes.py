"""
Verifies every internal link points at a route that exists.

A dead nav item or a card linking to a 404 typechecks, lints, and looks
correct in review — it only shows up when someone taps it. Cheap to check,
so it is checked.

    python3 scripts/check-routes.py
"""

import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
APP = os.path.join(ROOT, "app")

# Routes served by something other than a page.tsx, or handled elsewhere.
KNOWN = {"/auth/signout"}


def route_exists(path: str) -> bool:
    if path in KNOWN:
        return True

    segments = [s for s in path.strip("/").split("/") if s]
    directory = APP

    for segment in segments:
        literal = os.path.join(directory, segment)
        if os.path.isdir(literal):
            directory = literal
            continue

        # Fall back to a dynamic segment, e.g. [id].
        dynamic = [
            d
            for d in os.listdir(directory)
            if d.startswith("[") and os.path.isdir(os.path.join(directory, d))
        ]
        if not dynamic:
            return False
        directory = os.path.join(directory, dynamic[0])

    return os.path.exists(os.path.join(directory, "page.tsx")) or os.path.exists(
        os.path.join(directory, "route.ts")
    )


bad = []

for base in ("app", "components"):
    for dirpath, dirnames, filenames in os.walk(os.path.join(ROOT, base)):
        dirnames[:] = [d for d in dirnames if d not in {"node_modules", ".next"}]

        for name in filenames:
            if not name.endswith(".tsx"):
                continue

            full = os.path.join(dirpath, name)
            for lineno, line in enumerate(open(full), 1):
                # Static internal hrefs only. Template literals and variables
                # can't be resolved here and are left alone.
                for href in re.findall(r'href[:=]\s*"(/[^"{}]*)"', line):
                    clean = href.split("?")[0].split("#")[0]
                    if not route_exists(clean):
                        bad.append((os.path.relpath(full, ROOT), lineno, href))

for path, lineno, href in bad:
    print(f"FAIL  {path}:{lineno}  links to {href}, which has no page")

if bad:
    sys.exit(1)

print("PASS  every static internal link resolves to a route")
