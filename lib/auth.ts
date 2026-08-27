import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FIRST_STEP, isOnboardingStep, type OnboardingStep } from "@/lib/onboarding";

export type SessionProfile = {
  userId: string;
  email: string | null;
  displayName: string | null;
  coupleId: string | null;
  location: string | null;
  onboardedAt: string | null;
  onboardingStep: OnboardingStep;
};

/**
 * Loads the signed-in user and their profile.
 *
 * Deliberately does not redirect — callers decide. The onboarding flow needs
 * to read an incomplete profile without being bounced back into itself.
 */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name, couple_id, location, onboarded_at, onboarding_step")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[auth] profile lookup failed", error.message);
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName: profile?.display_name ?? null,
    coupleId: profile?.couple_id ?? null,
    location: profile?.location ?? null,
    onboardedAt: profile?.onboarded_at ?? null,
    // An unrecognised value in the database shouldn't strand anyone, so fall
    // back to the first step rather than throwing.
    onboardingStep: isOnboardingStep(profile?.onboarding_step)
      ? profile.onboarding_step
      : FIRST_STEP,
  };
}

/**
 * For pages that require a finished profile. Sends people to sign-in if
 * they have no session, and into onboarding if they haven't completed it.
 */
export async function requireOnboarded(): Promise<SessionProfile> {
  const session = await getSessionProfile();

  if (!session) redirect("/login");
  if (!session.onboardedAt) redirect("/welcome");

  return session;
}

/**
 * For the onboarding flow itself: needs a session, but must tolerate — and
 * in fact expects — an unfinished profile.
 */
export async function requireSession(): Promise<SessionProfile> {
  const session = await getSessionProfile();

  if (!session) redirect("/login");

  return session;
}
