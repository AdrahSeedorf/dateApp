-- ============================================================================
-- Chunk 8 — remember which onboarding path someone is on
--
-- The person who starts an account and the person they invite need different
-- flows. The invited partner shouldn't be asked to generate a first date
-- (their partner already did) or to invite someone (they were the invite).
--
-- Stored rather than inferred: "does this couple already have a member?" is
-- true at redemption time but stops being a reliable signal the moment
-- anything else changes, and onboarding must not shift under someone
-- halfway through.
--
-- Additive, so it's safe to run before the matching code deploys. Existing
-- rows stay null, which reads as the creator path — correct for everyone
-- who exists today.
-- ============================================================================

alter table public.profiles
  add column if not exists onboarding_path text;
