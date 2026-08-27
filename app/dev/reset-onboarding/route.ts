import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { FIRST_STEP, isOnboardingStep } from "@/lib/onboarding";

/**
 * Development-only: puts an account back at the start of onboarding.
 *
 * Onboarding is only reachable while onboarded_at is null, so testing it
 * repeatedly otherwise means a trip to the SQL editor each time.
 *
 * Defaults to the signed-in account. Pass ?email= to reset someone else,
 * which is how you test the invited-partner path without burning a token.
 * Pass ?step= to jump straight to a particular step.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const { searchParams, origin } = request.nextUrl;
  const email = searchParams.get("email");
  const requestedStep = searchParams.get("step");

  const step = isOnboardingStep(requestedStep) ? requestedStep : FIRST_STEP;

  const admin = createAdminClient();
  const values = { onboarded_at: null, onboarding_step: step };

  if (email) {
    // Resolve the account by email. listUsers is fine at this scale and
    // avoids needing a separate lookup table.
    const { data, error } = await admin.auth.admin.listUsers();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const target = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );

    if (!target) {
      return NextResponse.json(
        { error: `No account found for ${email}` },
        { status: 404 }
      );
    }

    const { error: updateError } = await admin
      .from("profiles")
      .update(values)
      .eq("id", target.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reset: email,
      step,
      note: "Sign in as them with /dev/login?email=... to walk the flow.",
    });
  }

  const session = await getSessionProfile();

  if (!session) {
    return NextResponse.json(
      { error: "Not signed in. Add ?email= or sign in first." },
      { status: 401 }
    );
  }

  const { error } = await admin
    .from("profiles")
    .update(values)
    .eq("id", session.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(`${origin}/welcome`);
}
