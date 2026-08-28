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

/**
 * Which flow someone is on.
 *
 * "creator" started the account; "partner" arrived through their invite.
 * The partner skips generating a first date (their partner already did) and
 * inviting someone (they were the invite).
 */
export type OnboardingPath = "creator" | "partner";

const SKIPPED_BY_PARTNER: OnboardingStep[] = ["generate", "invite"];

export function appliesTo(step: OnboardingStep, path: OnboardingPath): boolean {
  return path === "creator" || !SKIPPED_BY_PARTNER.includes(step);
}

export function stepsFor(path: OnboardingPath): OnboardingStep[] {
  return ONBOARDING_STEPS.filter((step) => appliesTo(step, path));
}

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
export function nextStep(
  current: OnboardingStep,
  path: OnboardingPath = "creator"
): OnboardingStep | null {
  const steps = stepsFor(path);
  const index = steps.indexOf(current);
  return steps[index + 1] ?? null;
}

/** Null on the first step, where there's nothing to go back to. */
export function previousStep(
  current: OnboardingStep,
  path: OnboardingPath = "creator"
): OnboardingStep | null {
  const steps = stepsFor(path);
  const index = steps.indexOf(current);
  return index > 0 ? steps[index - 1] : null;
}

export function stepNumber(
  step: OnboardingStep,
  path: OnboardingPath = "creator"
): number {
  return stepsFor(path).indexOf(step) + 1;
}

export function totalSteps(path: OnboardingPath = "creator"): number {
  return stepsFor(path).length;
}

export function isOptional(step: OnboardingStep): boolean {
  return OPTIONAL_STEPS.includes(step);
}
