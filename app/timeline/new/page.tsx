import Link from "next/link";
import { requireOnboarded } from "@/lib/auth";
import MilestoneForm from "@/components/timeline/MilestoneForm";
import { Screen, ScreenHeader } from "@/components/ui";

export const metadata = { title: "Add a milestone" };

export default async function NewMilestonePage() {
  await requireOnboarded();

  return (
    <Screen className="mx-auto max-w-xl">
      <Link
        href="/timeline"
        className="mt-space-lg inline-block text-body-sm text-on-surface-variant transition hover:text-on-surface"
      >
        ← Timeline
      </Link>

      <ScreenHeader
        eyebrow="Mark it"
        title="Something worth remembering"
        body="Past or future — both sit on the same line."
      />

      <MilestoneForm />
    </Screen>
  );
}
