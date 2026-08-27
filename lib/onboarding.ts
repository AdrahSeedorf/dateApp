/**
 * Onboarding step order, in one place.
 *
 * The order encodes the design decision that matters: the partner invite
 * comes *after* the person has generated a real date. Asking before they've
 * seen anything is why people never invite anyone.
 */
export const ONBOARDING_STEPS = [
  "name",
  "location",
  "generate",
  "invite",
  "prefs",
  "memories",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Steps a person can move past without answering. */
export const OPTIONAL_STEPS: OnboardingStep[] = ["prefs", "memories"];

export const FIRST_STEP: OnboardingStep = ONBOARDING_STEPS[0];

export function isOnboardingStep(value: unknown): value is OnboardingStep {
  return (
    typeof value === "string" &&
    (ONBOARDING_STEPS as readonly string[]).includes(value)
  );
}

/** Null means there is no next step — onboarding is finished. */
export function nextStep(current: OnboardingStep): OnboardingStep | null {
  const index = ONBOARDING_STEPS.indexOf(current);
  return ONBOARDING_STEPS[index + 1] ?? null;
}

export function stepNumber(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step) + 1;
}

export const TOTAL_STEPS = ONBOARDING_STEPS.length;

export function isOptional(step: OnboardingStep): boolean {
  return OPTIONAL_STEPS.includes(step);
}
