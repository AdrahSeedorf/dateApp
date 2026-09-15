"""
Validates the SQL in supabase/ before it ever reaches a database.

Migrations and tests are written here but run on the user's machine, so a
syntax error would otherwise surface as a failed deploy rather than a failed
check. Also guards two things that are easy to get wrong:

  * psql meta-commands (\\set, \\i) — these work in a terminal but fail in
    the Supabase SQL editor, which is where these files actually get run.
  * the assertion count a test claims in its summary, which silently drifts
    as assertions are added.

    python3 scripts/check-sql.py
"""

import os, re, sys

import pglast

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")


def strip_comments(sql: str) -> str:
    sql = re.sub(r"/\*.*?\*/", "", sql, flags=re.S)
    return re.sub(r"--[^\n]*", "", sql)


failures = 0

for sub in ("migrations", "tests"):
    directory = os.path.join(ROOT, "supabase", sub)
    if not os.path.isdir(directory):
        continue

    for name in sorted(os.listdir(directory)):
        if not name.endswith(".sql"):
            continue

        path = os.path.join(directory, name)
        raw = open(path).read()
        bare = strip_comments(raw)

        if sub == "tests":
            # Tests may only create throwaway objects in pg_temp. Creating
            # anything in public made the harness depend on how the SQL
            # editor scopes statements, which cost three debugging rounds.
            stray = re.findall(
                r"create\s+(?:table|sequence|view)\s+(?!if\s+not\s+exists\s+)?public\.",
                bare, re.I,
            )
            if stray:
                print(f"FAIL  {sub}/{name}: creates objects in public; "
                      f"use pg_temp or nothing at all")
                failures += 1
                continue

        meta = re.findall(r"^\s*\\\w+", bare, re.M)
        if meta:
            print(f"FAIL  {sub}/{name}: psql meta-commands {sorted(set(meta))}")
            failures += 1
            continue

        try:
            count = len(pglast.parse_sql(raw))
        except Exception as exc:
            print(f"FAIL  {sub}/{name}: {exc}")
            failures += 1
            continue

        note = ""
        claimed = re.search(r"ALL (\d+) TESTS PASSED", raw)
        if claimed:
            # Count both assertion helpers, minus one each for their own
            # definitions. Counted against the comment-stripped source: a
            # doc comment that mentions pg_temp.ok() is not an assertion,
            # and counting one was how this check first went wrong.
            found = (
                len(re.findall(r"pg_temp\.ok\(", bare)) - 1
                + len(re.findall(r"pg_temp\.ok_eq\(", bare)) - 1
            )
            want = int(claimed.group(1))
            if found != want:
                print(f"FAIL  {sub}/{name}: claims {want} tests, has {found}")
                failures += 1
                continue
            note = f", {found} assertions"

        print(f"PASS  {sub}/{name}  ({count} statements{note})")

sys.exit(1 if failures else 0)
