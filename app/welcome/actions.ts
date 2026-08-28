"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { ensureCoupleId } from "@/lib/couple";
import {
  isOnboardingStep,
  nextStep,
  previousStep,
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
 * Saves the idea someone picked during onboarding.
 *
 * Creates the couple if they don't have one yet. Invited people already do,
 * but someone who signs up on their own has no container to put a plan in
 * until this runs.
 */
export async function saveFirstPlan(idea: {
  title: string;
  activity: string;
  locationType: string;
  budgetEstimate: string;
  outfitNote: string;
  vibeNote: string;
}): Promise<StepState> {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const couple = await ensureCoupleId(supabase, session.userId, session.coupleId);

  if ("error" in couple) return { error: couple.error };

  const { error } = await supabase.from("date_plans").insert({
    couple_id: couple.coupleId,
    title: idea.title,
    activity: idea.activity,
    location_type: idea.locationType,
    budget_estimate: idea.budgetEstimate,
    outfit_note: idea.outfitNote,
    vibe_note: idea.vibeNote,
  });

  if (error) {
    console.error("[onboarding] plan save failed", error.message);
    return { error: "Couldn't save that idea. Try again." };
  }

  return {};
}

/**
 * Steps back one.
 *
 * Answers are already written to the profile as you go, and each step
 * prefills from what's stored, so going back to fix a typo and coming
 * forward again loses nothing.
 */
export async function goBack(from: OnboardingStep) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  if (from !== session.onboardingStep) {
    revalidatePath("/welcome");
    return;
  }

  const previous = previousStep(from);
  if (!previous) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_step: previous })
    .eq("id", session.userId);

  if (error) {
    console.error("[onboarding] failed to step back", error.message);
    throw new Error("Couldn't go back. Try again.");
  }

  revalidatePath("/welcome");
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
