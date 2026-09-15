import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import {
  previousStep,
  stepNumber,
  totalSteps,
  type OnboardingStep,
} from "@/lib/onboarding";
import { Card, Screen } from "@/components/ui";
import TextStep from "@/components/onboarding/TextStep";
import GenerateStep from "@/components/onboarding/GenerateStep";
import InviteStep from "@/components/onboarding/InviteStep";
import PrefsStep from "@/components/onboarding/PrefsStep";
import SeedMemoriesStep from "@/components/onboarding/SeedMemoriesStep";
import { advanceStep, goBack, saveLocation, saveName } from "./actions";

const STEP_COPY: Record<OnboardingStep, { title: string; body: string }> = {
  name: {
    title: "What should we call you?",
    body: "Your partner will see this name.",
  },
  location: {
    title: "Where are you?",
    body: "So date ideas can name real places near you, not generic ones.",
  },
  generate: {
    title: "Let's find you something to do",
    body: "Two real ideas, before anything else is asked of you.",
  },
  invite: {
    title: "Bring the other half",
    body: "This works properly once you're both here.",
  },
  prefs: {
    title: "Anything we should factor in?",
    body: "Interests, things you'd like to try, and anything a date needs to work around.",
  },
  memories: {
    title: "Add a few from before",
    body: "Three memories from before today, so this doesn't start empty.",
  },
};

const STEP_WIDTH: Record<OnboardingStep, string> = {
  name: "max-w-md",
  location: "max-w-md",
  generate: "max-w-2xl",
  invite: "max-w-md",
  prefs: "max-w-3xl",
  memories: "max-w-xl",
};

/**
 * A partner arriving through an invite is in a different situation to
 * someone setting this up alone, and shouldn't be told to invite anyone.
 */
const PARTNER_COPY: Partial<Record<OnboardingStep, { title: string; body: string }>> = {
  name: {
    title: "You're in",
    body: "Someone set this up for the two of you. What should we call you?",
  },
  prefs: {
    title: "Anything we should know?",
    body: "This shapes the date ideas you'll both get. Skip it if you'd rather.",
  },
  memories: {
    title: "Add a few from before",
    body: "Anything you'd want kept. Skip it and add them whenever.",
  },
};

export default async function WelcomePage() {
  const session = await requireSession();

  if (session.onboardedAt) redirect("/home");

  const step = session.onboardingStep;
  const path = session.onboardingPath;
  const copy =
    (path === "partner" ? PARTNER_COPY[step] : undefined) ?? STEP_COPY[step];
  const current = stepNumber(step, path);
  const total = totalSteps(path);

  // Single-question steps want a narrow column; the content-heavy ones need
  // room or they turn into a very long, very thin scroll.
  const width = STEP_WIDTH[step];

  async function skip() {
    "use server";
    await advanceStep(step);
  }

  async function back() {
    "use server";
    await goBack(step);
  }

  const canGoBack = previousStep(step, path) !== null;

  return (
    <Screen className="flex min-h-screen items-center justify-center py-12">
      <div className={`${width} w-full`}>
        <div className="mb-space-sm h-6">
          {canGoBack && (
            <form action={back}>
              <button
                type="submit"
                className="text-body-sm text-on-surface-variant transition hover:text-on-surface"
              >
                ← Back
              </button>
            </form>
          )}
        </div>

        {/* One rail per step rather than a single bar: the number of steps
            differs by path, and seeing how many are left is the point. */}
        <div
          className="mb-space-xl flex items-center gap-2"
          role="group"
          aria-label={`Step ${current} of ${total}`}
        >
          {Array.from({ length: total }, (_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full ${
                index < current ? "bg-primary" : "bg-[var(--glass-rim)]"
              }`}
            />
          ))}
        </div>

        <Card className="p-8">
          <p className="text-label-sm text-primary tracking-[0.3em] mb-space-md">
            STEP {current} OF {total}
          </p>

          <h1 className="font-headline text-headline-md md:text-headline-lg text-on-surface mb-space-sm text-balance">
            {copy.title}
          </h1>

          <p className="text-body-md text-on-surface-variant leading-relaxed mb-space-xl text-pretty">
            {copy.body}
          </p>

          {step === "name" && (
            <TextStep
              name="name"
              label="Your name"
              placeholder="Seedorf"
              defaultValue={session.displayName ?? ""}
              action={saveName}
            />
          )}

          {step === "location" && (
            <TextStep
              name="location"
              label="Town or suburb"
              placeholder="Penrith, NSW"
              hint="Close enough to be useful, not so exact it's uncomfortable."
              defaultValue={session.location ?? ""}
              action={saveLocation}
            />
          )}

          {step === "generate" && (
            <GenerateStep location={session.location ?? ""} onDone={skip} />
          )}

          {step === "invite" && <InviteStep onDone={skip} />}

          {step === "prefs" && <PrefsStep onSkip={skip} />}

          {step === "memories" && <SeedMemoriesStep onSkip={skip} />}
        </Card>
      </div>
    </Screen>
  );
}
