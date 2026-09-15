import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button, Card, Screen } from "@/components/ui";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already signed in — go straight to the dashboard.
  if (user) {
    redirect("/home");
  }

  return (
    <Screen className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-lg text-center p-10">
        <p className="text-label-sm text-primary tracking-[0.4em] mb-space-lg">
          HIDDEN TRUTHS
        </p>

        <h1 className="font-headline text-display-lg-mobile md:text-display-lg text-on-surface mb-space-md text-balance">
          Plan dates. Keep the <em>memories</em>.
        </h1>

        <p className="text-body-lg text-on-surface-variant mb-space-xl leading-relaxed text-pretty">
          Somewhere to decide what to do together — and somewhere for it to
          live afterwards.
        </p>

        <Button href="/login" className="rounded-full px-8">
          Sign in
        </Button>

        <p className="text-body-sm text-on-surface-variant/70 mt-space-lg">
          Invite only for now.
        </p>
      </Card>
    </Screen>
  );
}
