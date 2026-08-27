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

export type StepState = { error?: string };

const MAX_NAME = 60;
const MAX_LOCATION = 120;

/**
 * Writes a set of profile columns and advances, in that order. If the write
 * fails the step doesn't move, so nobody ends up past a question their
 * answer never got saved for.
 */
async function saveAndAdvance(
  from: OnboardingStep,
  values: Record<string, string | null>
): Promise<StepState> {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  if (from !== session.onboardingStep) {
    // Stale tab. Let the page re-render wherever they actually are.
    revalidatePath("/welcome");
    return {};
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update(values)
    .eq("id", session.userId);

  if (error) {
    console.error("[onboarding] save failed", { from, error: error.message });
    return { error: "Couldn't save that. Try again." };
  }

  await advanceStep(from);
  return {};
}

export async function saveName(
  _prev: StepState,
  formData: FormData
): Promise<StepState> {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    return { error: "Enter a name so your partner knows who's who." };
  }

  if (name.length > MAX_NAME) {
    return { error: `Keep it under ${MAX_NAME} characters.` };
  }

  return saveAndAdvance("name", { display_name: name });
}

export async function saveLocation(
  _prev: StepState,
  formData: FormData
): Promise<StepState> {
  const location = String(formData.get("location") ?? "").trim();

  if (!location) {
    return { error: "Enter a town or suburb so ideas can name real places." };
  }

  if (location.length > MAX_LOCATION) {
    return { error: `Keep it under ${MAX_LOCATION} characters.` };
  }

  return saveAndAdvance("location", { location });
}

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
