import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, createOtpClient } from "@/lib/supabase/server";

/**
 * Redeems a single-use invite token and signs the person straight in.
 * This is the V1 -> V2 handoff.
 *
 * A route handler rather than a page: this has real side effects (creating
 * an account, linking a profile, burning a token). Pages can render more
 * than once per request in dev and can be prefetched, which would generate
 * a second token and silently invalidate the first.
 *
 * Everything happens in this one request — generate, verify, then burn —
 * so the token can never go stale between redirects.
 */

function fail(origin: string, reason: string) {
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(reason)}`
  );
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const invite = searchParams.get("invite");

  if (!invite) {
    return fail(origin, "That link is missing its invite code.");
  }

  const admin = createAdminClient();

  const { data: inviteRow, error: inviteError } = await admin
    .from("invites")
    .select("token, couple_id, email, display_name, used_at, expires_at")
    .eq("token", invite)
    .maybeSingle();

  if (inviteError || !inviteRow) {
    console.error("[join] invite lookup failed", {
      tokenPreview: invite.slice(0, 8),
      tokenLength: invite.length,
      error: inviteError?.message,
    });
    return fail(origin, "We couldn't find that invite.");
  }

  if (inviteRow.used_at) {
    return fail(
      origin,
      "That invite has already been used. Sign in with your email instead."
    );
  }

  if (inviteRow.expires_at && new Date(inviteRow.expires_at) < new Date()) {
    return fail(origin, "That invite has expired.");
  }

  if (!inviteRow.email) {
    return fail(origin, "That invite has no email attached to it.");
  }

  const email = inviteRow.email;

  // Generate a sign-in token. If the account doesn't exist yet, create it
  // and try again.
  let link = await admin.auth.admin.generateLink({ type: "magiclink", email });

  if (link.error) {
    const created = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    if (created.error) {
      console.error("[join] createUser failed", {
        email,
        error: created.error.message,
      });
      return fail(origin, "We couldn't set up your account.");
    }

    link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  }

  const hashedToken = link.data?.properties?.hashed_token;
  const userId = link.data?.user?.id;

  if (link.error || !hashedToken || !userId) {
    console.error("[join] generateLink failed", {
      email,
      error: link.error?.message,
      gotHashedToken: Boolean(hashedToken),
      gotUserId: Boolean(userId),
    });
    return fail(origin, "We couldn't create a sign-in link.");
  }

  // Attach the account to the couple before signing in, so the dashboard
  // never loads without a couple_id.
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      couple_id: inviteRow.couple_id,
      display_name: inviteRow.display_name,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    console.error("[join] profile upsert failed", {
      userId,
      coupleId: inviteRow.couple_id,
      error: profileError.message,
    });
    return fail(origin, "We couldn't finish setting up your account.");
  }

  // Verify in this same request. Implicit flow, because no PKCE handshake
  // was ever started by the browser.
  const supabase = await createOtpClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: hashedToken,
  });

  if (verifyError) {
    console.error("[join] verifyOtp failed", {
      email,
      error: verifyError.message,
    });
    return fail(origin, `Sign-in failed: ${verifyError.message}`);
  }

  // Only burn the token once the session actually exists. If anything above
  // failed, the invite is still usable for a retry.
  const { error: burnError } = await admin
    .from("invites")
    .update({ used_at: new Date().toISOString() })
    .eq("token", invite);

  if (burnError) {
    console.error("[join] failed to mark invite used", {
      error: burnError.message,
    });
  }

  return NextResponse.redirect(`${origin}/home`);
}
