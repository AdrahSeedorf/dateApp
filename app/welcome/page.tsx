import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import {
  previousStep,
  stepNumber,
  TOTAL_STEPS,
  type OnboardingStep,
} from "@/lib/onboarding";
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

export default async function WelcomePage() {
  const session = await requireSession();

  if (session.onboardedAt) redirect("/home");

  const step = session.onboardingStep;
  const copy = STEP_COPY[step];
  const current = stepNumber(step);

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

  const canGoBack = previousStep(step) !== null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_center,#2d0f36,#050510_75%)] px-6 py-12">
      <div className={`${width} w-full`}>
        <div className="h-6 mb-3">
          {canGoBack && (
            <form action={back}>
              <button
                type="submit"
                className="text-white/40 hover:text-white text-sm transition"
              >
                ← Back
              </button>
            </form>
          )}
        </div>

        <div className="flex items-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full ${
                index < current ? "bg-pink-400" : "bg-white/10"
              }`}
            />
          ))}
        </div>

        <div className="rounded-3xl border border-pink-300/20 bg-white/5 backdrop-blur-xl p-8">
          <p className="tracking-[0.3em] text-xs text-pink-200 mb-4">
            STEP {current} OF {TOTAL_STEPS}
          </p>

          <h1 className="text-2xl md:text-3xl font-bold mb-3">{copy.title}</h1>

          <p className="text-white/60 leading-relaxed mb-8">{copy.body}</p>

          {step === "name" && (
            <TextStep
              name="name"
              label="YOUR NAME"
              placeholder="Seedorf"
              defaultValue={session.displayName ?? ""}
              action={saveName}
            />
          )}

          {step === "location" && (
            <TextStep
              name="location"
              label="TOWN OR SUBURB"
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
        </div>
      </div>
    </main>
  );
}
