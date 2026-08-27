import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import {
  isOptional,
  stepNumber,
  TOTAL_STEPS,
  type OnboardingStep,
} from "@/lib/onboarding";
import { advanceStep } from "./actions";

/**
 * Placeholder content per step. Chunks 3–7 replace each of these with the
 * real screen; the routing, resumability and progress around them is done.
 */
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

export default async function WelcomePage() {
  const session = await requireSession();

  // Already finished — nothing to do here.
  if (session.onboardedAt) redirect("/home");

  const step = session.onboardingStep;
  const copy = STEP_COPY[step];
  const current = stepNumber(step);

  async function next() {
    "use server";
    await advanceStep(step);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_center,#2d0f36,#050510_75%)] px-6 py-12">
      <div className="max-w-md w-full">
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

          <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 mb-8 text-center">
            <p className="text-white/30 text-sm">
              This step gets built in a later chunk.
            </p>
          </div>

          <form action={next}>
            <button
              type="submit"
              className="w-full px-6 py-4 rounded-full bg-pink-500 hover:bg-pink-400 transition font-semibold"
            >
              {isOptional(step) ? "Skip for now" : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
