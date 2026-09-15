"""
Catches references to design tokens that don't exist at runtime.

app/globals.css declares scale tokens inside `@theme inline`. The `inline`
keyword makes Tailwind bake the values straight into utilities rather than
emitting custom properties, which is what lets a data-theme swap recolour the
app. The trap: `var(--spacing-space-lg)` in a component looks correct, passes
typecheck, passes lint, and silently resolves to nothing in the browser.

Colour tokens are fine to reference as var(--c-*) because those are declared
in real :root / [data-theme] blocks. So are the glass and shadow vars.

    python3 scripts/check-tokens.py

Exits non-zero on any bad reference.
"""

import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
css = open(os.path.join(ROOT, "app", "globals.css")).read()

# Vars declared inside @theme inline — inlined, NOT emitted as properties.
theme_block = re.search(r"@theme inline \{(.*?)\n\}", css, re.S).group(1)
inlined = set(re.findall(r"^\s*(--[\w-]+)\s*:", theme_block, re.M))

# Vars declared in normal blocks — these do exist at runtime.
runtime = set(re.findall(r"^\s*(--[\w-]+)\s*:", css, re.M)) - inlined

bad = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in {"node_modules", ".next", ".git"}]
    for name in filenames:
        if not name.endswith((".tsx", ".ts")):
            continue
        path = os.path.join(dirpath, name)
        for lineno, line in enumerate(open(path), 1):
            for ref in re.findall(r"var\((--[\w-]+)", line):
                if ref in inlined:
                    rel = os.path.relpath(path, ROOT)
                    bad.append((rel, lineno, ref))

for rel, lineno, ref in bad:
    print(f"FAIL  {rel}:{lineno}  var({ref}) is declared in @theme inline "
          f"and does not exist at runtime")

if bad:
    print(f"\n{len(bad)} bad reference(s). Use the Tailwind utility "
          f"(e.g. p-space-lg) or a literal value instead.")
    sys.exit(1)

print(f"PASS  no components reference inlined-only tokens "
      f"({len(inlined)} inlined, {len(runtime)} runtime vars available)")
