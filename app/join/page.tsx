import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{ invite?: string }>;
};

function JoinError({ message }: { message: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_center,#2d0f36,#050510_75%)] px-6">
      <div className="max-w-md w-full text-center rounded-3xl border border-pink-300/20 bg-white/5 backdrop-blur-xl p-8">
        <h1 className="text-2xl font-bold mb-4">This link didn&apos;t work</h1>

        <p className="text-white/60 mb-8 leading-relaxed">{message}</p>

        <Link
          href="/login"
          className="inline-block px-6 py-3 rounded-full bg-pink-500 hover:bg-pink-400 transition text-sm font-semibold"
        >
          Sign in with email instead
        </Link>
      </div>
    </main>
  );
}

/**
 * Redeems a single-use invite token and signs the person straight in.
 *
 * This is the V1 -> V2 handoff. It runs with the service role because the
 * `invites` table is intentionally unreadable by public clients, and because
 * the person has no session yet at this point.
 */
export default async function JoinPage({ searchParams }: Props) {
  const { invite } = await searchParams;

  if (!invite) {
    return <JoinError message="No invite code was included in the link." />;
  }

  const admin = createAdminClient();

  const { data: inviteRow, error: inviteError } = await admin
    .from("invites")
    .select("token, couple_id, email, display_name, used_at, expires_at")
    .eq("token", invite)
    .maybeSingle();

  if (inviteError || !inviteRow) {
    return <JoinError message="We couldn't find that invite." />;
  }

  if (inviteRow.used_at) {
    return (
      <JoinError message="This invite has already been used. You can still sign in with your email." />
    );
  }

  if (inviteRow.expires_at && new Date(inviteRow.expires_at) < new Date()) {
    return (
      <JoinError message="This invite has expired. You can still sign in with your email." />
    );
  }

  if (!inviteRow.email) {
    return <JoinError message="This invite is missing an email address." />;
  }

  const email = inviteRow.email;

  // Generate a sign-in link server-side. If the account doesn't exist yet,
  // create it first, then retry.
  let linkResult = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkResult.error) {
    const { error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    if (createError) {
      return <JoinError message="We couldn't set up an account for you." />;
    }

    linkResult = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
  }

  const hashedToken = linkResult.data?.properties?.hashed_token;
  const userId = linkResult.data?.user?.id;

  if (linkResult.error || !hashedToken || !userId) {
    return <JoinError message="We couldn't create a sign-in link for you." />;
  }

  // Attach the account to the couple.
  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      couple_id: inviteRow.couple_id,
      display_name: inviteRow.display_name,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    return <JoinError message="We couldn't finish setting up your account." />;
  }

  // Burn the token so the link can't be reused.
  await admin
    .from("invites")
    .update({ used_at: new Date().toISOString() })
    .eq("token", invite);

  redirect(
    `/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}&type=email&next=/home`
  );
}
