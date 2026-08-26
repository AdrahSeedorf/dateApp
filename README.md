# Hidden Truths — V2

The couples platform: plan dates, keep the memories.

Separate from the V1 proposal app (`final-level`) on purpose. V1 contains real
personal photos and the proposal itself, and anything in a Next.js `public/`
folder is served to anyone who asks for it — no auth check applies to static
files. Keeping the two apps in separate repos and separate deployments is what
stops her photos from being reachable by other users of this app.

---

## Setup

### 1. Install

```bash
npm install
```

### 2. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) → New project.
2. Pick a region close to you. Save the database password somewhere safe.
3. Wait for it to finish provisioning.

### 3. Run the schema

In the Supabase dashboard → **SQL Editor** → New query, paste the entire
contents of `supabase/migrations/0001_init.sql` and run it.

This creates the tables, Row Level Security policies, and the private storage
bucket for photos and videos.

### 4. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in from Supabase → Project Settings:

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Data API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | API Keys → anon / public |
| `SUPABASE_SERVICE_ROLE_KEY` | API Keys → service_role |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally |

> **The service role key bypasses all security rules.** It must never be
> prefixed with `NEXT_PUBLIC_`, never imported into a client component, and
> never committed. `.env.local` is gitignored.

### 5. Auth redirect URLs

Supabase → Authentication → URL Configuration → **Redirect URLs**, add:

```
http://localhost:3000/auth/callback
http://localhost:3000/auth/confirm
```

Add the production equivalents once deployed.

### 6. Run it

```bash
npm run dev
```

---

## Creating the couple and the invite

There's no public signup — this is invite-only. Run this in the Supabase SQL
editor, substituting real values:

```sql
-- 1. The couple
insert into public.couples (name, started_at)
values ('Us', '2026-02-04')          -- relationship start date
returning id;

-- 2. The invite for her (use the id returned above)
insert into public.invites (token, couple_id, email, display_name, expires_at)
values (
  encode(gen_random_bytes(16), 'hex'),  -- the token
  'PASTE-COUPLE-ID-HERE',
  'her@example.com',
  'Her name',
  now() + interval '90 days'
)
returning token;
```

The returned token becomes her handoff link at the end of V1:

```
https://your-v2-domain.com/join?invite=THE_TOKEN
```

Opening it signs her straight in — no email round trip, no signup form. It is
single-use and burns itself after redemption. If it ever fails, she can still
sign in normally at `/login`, so the proposal is never dependent on it working.

For your own account, create a second invite with your email, or add yourself
via Supabase → Authentication → Users and then insert a `profiles` row with the
same `couple_id`.

---

## Architecture notes

**Everything is scoped to a `couple_id`.** Supporting many couples later is a
signup change, not a rewrite.

**Row Level Security is the actual security boundary.** The anon key is public
by design and safe to ship to the browser; RLS is what stops one couple reading
another's data. Every table has it enabled.

**The `invites` table has RLS on and zero policies.** That means no browser
client can read or write it at all. Invite redemption happens server-side in
`app/join/page.tsx` using the service role, which is the only place that key is
used.

**Storage paths are `{couple_id}/{memory_id}/{filename}`** so the first path
segment is what the storage policies check.

---

## Status

Done:

- Project scaffold, Tailwind v4, TypeScript
- Full schema + RLS + storage bucket
- Supabase browser/server/admin clients
- Session refresh middleware and route gating
- Magic-link sign-in
- Invite redemption (the V1 → V2 handoff)
- Our Journey dashboard reading real data

Next:

- Memory Vault (list, detail, create/edit, photo + video upload)
- Port the Date Generator over from V1, saving to `date_plans`
- Link a memory to the date it came from
- Messaging (deferred — after memories are solid)
