"""
Verifies every theme in app/globals.css meets WCAG AA contrast.

The design system is themeable, so a palette can be added months from now by
someone who has forgotten the constraint. Accessibility is a hard requirement
in this product, so it is checked by a script rather than by eye.

    python3 scripts/check-contrast.py

Exits non-zero on any failure, so it can gate CI.
"""

import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
css = open(os.path.join(HERE, '..', 'app', 'globals.css')).read()

def lum(hexs):
    hexs = hexs.lstrip('#')
    r,g,b = (int(hexs[i:i+2],16)/255 for i in (0,2,4))
    f = lambda c: c/12.92 if c <= 0.03928 else ((c+0.055)/1.055)**2.4
    r,g,b = f(r),f(g),f(b)
    return 0.2126*r + 0.7152*g + 0.0722*b

def ratio(a,b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la,lb), min(la,lb)
    return (hi+0.05)/(lo+0.05)

# Pull each theme block
themes = {}
for m in re.finditer(r'(?:\[data-theme="(\w+)"\]|:root,\s*\[data-theme="(\w+)"\])\s*\{(.*?)\n\}', css, re.S):
    name = m.group(1) or m.group(2)
    body = m.group(3)
    vals = dict(re.findall(r'(--c-[\w-]+):\s*(#[0-9a-fA-F]{6})', body))
    if vals and name:
        themes[name] = vals

# Pairs that must pass, with the WCAG minimum that applies.
# 4.5 = normal text, 3.0 = large text (>=18.66px bold or 24px) and UI borders.
PAIRS = [
    ("on-surface",           "surface",                  4.5, "body text on canvas"),
    ("on-surface-variant",   "surface",                  4.5, "muted text on canvas"),
    ("on-surface-variant",   "surface-container",        4.5, "muted text on a card"),
    ("on-surface",           "surface-container-high",   4.5, "body text on raised card"),
    ("primary",              "surface",                  4.5, "accent text / icons"),
    ("primary",              "surface-container",        4.5, "accent on a card"),
    ("secondary",            "surface",                  4.5, "secondary accent"),
    ("tertiary",             "surface",                  4.5, "tertiary accent"),
    ("on-primary",           "primary",                  4.5, "label on primary button"),
    ("on-secondary",         "secondary",                4.5, "label on secondary fill"),
    ("on-tertiary",          "tertiary",                 4.5, "label on tertiary fill"),
    ("on-secondary-container","secondary-container",     4.5, "label on secondary container"),
    ("on-primary-container", "primary-container",        4.5, "label on primary container"),
    ("outline",              "surface",                  3.0, "borders / dividers"),
]

fails = 0
for tname, vals in sorted(themes.items()):
    print(f"\n=== {tname} ===")
    for fg, bg, minimum, label in PAIRS:
        f, b = vals.get('--c-'+fg), vals.get('--c-'+bg)
        if not f or not b:
            print(f"  ?? missing {fg} or {bg}")
            continue
        r = ratio(f,b)
        ok = r >= minimum
        if not ok: fails += 1
        print(f"  {'PASS' if ok else 'FAIL'}  {r:5.2f}  (min {minimum})  {label}")

print(f"\n{'ALL PASS' if fails==0 else str(fails)+' FAILURES'}")
sys.exit(1 if fails else 0)
