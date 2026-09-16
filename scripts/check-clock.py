"""
Catches tests that depend on today's date.

A `sealedSummary` test passed for a day and then failed overnight when the
date rolled over, because the function read the real clock instead of taking
one. Every date-aware helper in lib/ accepts `now` for exactly this reason,
and a test that omits it is a failure scheduled for some future morning.

    python3 scripts/check-clock.py
"""

import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.join(HERE, "..", "lib")

# Functions whose last parameter is an injectable clock.
CLOCKED = [
    "isUnlockable", "daysUntilUnlock", "sealedSummary", "earliestUnlockDate",
    "anniversary", "greeting", "buildTimeline", "daysUntilReunion",
    "dayDifference", "localTime", "timeAgo",
]

# Anything that looks like a deliberately supplied clock.
PINNED = re.compile(r"\bNOW\b|\bnow\b|new Date\(")


def calls(source: str, fn: str):
    """Yields (offset, argument text) for each call, balancing parentheses.

    Written by hand rather than with a regex because these calls span lines,
    and a line-at-a-time scan was exactly what produced a screen of false
    positives the first time.
    """
    for match in re.finditer(rf"\b{fn}\(", source):
        i = match.end()
        depth = 1
        while i < len(source) and depth:
            if source[i] == "(":
                depth += 1
            elif source[i] == ")":
                depth -= 1
            i += 1
        yield match.start(), source[match.end() : i - 1]


problems = []

for name in sorted(os.listdir(LIB)):
    if not name.endswith(".test.ts"):
        continue

    raw = open(os.path.join(LIB, name)).read()
    # Comments often mention the clock; they aren't calls.
    source = re.sub(r"//[^\n]*", "", re.sub(r"/\*.*?\*/", "", raw, flags=re.S))

    for fn in CLOCKED:
        for offset, args in calls(source, fn):
            if PINNED.search(args):
                continue
            problems.append((name, source[:offset].count("\n") + 1, fn))

for name, lineno, fn in sorted(problems):
    print(f"FAIL  lib/{name}:{lineno}  {fn}() called without a pinned clock")

if problems:
    print("\nPass an explicit `now` so the test means the same thing tomorrow.")
    sys.exit(1)

print("PASS  every clock-dependent call in tests is pinned")
