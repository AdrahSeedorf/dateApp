"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import {
  isOnboardingStep,
  nextStep,
  type OnboardingStep,
} from "@/lib/onboarding";

/**
 * Moves someone to the next step, or finishes onboarding if there isn't one.
 *
 * Takes the step the client believed it was on and ignores it if it doesn't
 * match the database. Otherwise a stale tab could walk someone backwards or
 * skip a step they haven't done.
 */
export async function advanceStep(from: OnboardingStep) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  if (!isOnboardingStep(from) || from !== session.onboardingStep) {
    // Stale submission. Re-render wherever they actually are.
    revalidatePath("/welcome");
    return;
  }

  const supabase = await createClient();
  const next = nextStep(from);

  const { error } = await supabase
    .from("profiles")
    .update(
      next
        ? { onboarding_step: next }
        : { onboarding_step: null, onboarded_at: new Date().toISOString() }
    )
    .eq("id", session.userId);

  if (error) {
    console.error("[onboarding] failed to advance step", error.message);
    throw new Error("Couldn't save your progress. Try again.");
  }

  if (!next) redirect("/home");

  revalidatePath("/welcome");
}
