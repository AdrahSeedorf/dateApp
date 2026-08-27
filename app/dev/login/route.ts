import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, createOtpClient } from "@/lib/supabase/server";

/**
 * Development-only sign-in. Skips email entirely.
 *
 * Supabase's built-in email service allows only a few messages per hour on
 * the free tier, which testing exhausts almost immediately. This signs an
 * existing account in directly using the service role, the same way /join
 * does for an invite.
 *
 * SECURITY: this is an account-takeover route by design — anyone who can
 * reach it can sign in as any existing user without proving anything. It
 * must never be reachable in a deployed environment.
 *
 * NODE_ENV is "production" for both Vercel production and preview builds,
 * and "development" only under `next dev`, so this is off anywhere it
 * could be reached by someone else.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const { searchParams, origin } = request.nextUrl;
  const email = searchParams.get("email");
  const next = searchParams.get("next") ?? "/home";

  if (!email) {
    return NextResponse.json(
      { error: "Add ?email=you@example.com" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Only signs in accounts that already exist — this deliberately does not
  // create users, so a typo fails loudly instead of quietly making a second
  // account that isn't linked to a couple.
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  const hashedToken = link.data?.properties?.hashed_token;

  if (link.error || !hashedToken) {
    console.error("[dev-login] generateLink failed", {
      email,
      error: link.error?.message,
    });

    return NextResponse.json(
      {
        error:
          "Couldn't sign in. Does that account exist? This route won't create one.",
        detail: link.error?.message ?? null,
      },
      { status: 400 }
    );
  }

  const supabase = await createOtpClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: hashedToken,
  });

  if (verifyError) {
    console.error("[dev-login] verifyOtp failed", {
      email,
      error: verifyError.message,
    });

    return NextResponse.json(
      { error: verifyError.message },
      { status: 400 }
    );
  }

  console.warn(`[dev-login] signed in as ${email} — development only`);

  return NextResponse.redirect(`${origin}${next}`);
}
