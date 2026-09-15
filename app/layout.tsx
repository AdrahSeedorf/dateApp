import type { Metadata, Viewport } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { safeTheme } from "@/lib/coupleProfile";
import "./globals.css";

/**
 * Self-hosted through next/font rather than a <link> to Google Fonts.
 * Stitch's export uses the CDN, which costs a render-blocking round trip and
 * leaks a request to a third party on every page view. next/font inlines the
 * face and sizes the fallback, so there's no flash of unstyled text either.
 *
 * Playfair carries a genuine italic — DESIGN.md is explicit that editorial
 * emphasis must never be synthesised — so the italic style is loaded too.
 */
const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hidden Truths",
  description: "Plan dates. Keep the memories.",
};

export const viewport: Viewport = {
  themeColor: "#13121c",
  // The design floats a bottom bar over the home indicator and runs
  // edge-to-edge media, both of which need the real safe-area insets.
  viewportFit: "cover",
};

/**
 * Reads the couple's chosen theme.
 *
 * Deliberately tolerant: signed out, mid-onboarding, or a database hiccup all
 * mean "midnight" rather than an error. The root layout wraps every page
 * including the sign-in screen, so it must never be the thing that fails.
 */
async function currentTheme(): Promise<string> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return "midnight";

    const { data: profile } = await supabase
      .from("profiles")
      .select("couple_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.couple_id) return "midnight";

    const { data: couple } = await supabase
      .from("couples")
      .select("theme")
      .eq("id", profile.couple_id)
      .maybeSingle();

    return safeTheme(couple?.theme);
  } catch {
    return "midnight";
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // One attribute drives the entire palette — every colour token resolves
  // through it, so this is the whole of theming.
  const theme = await currentTheme();

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${playfair.variable} ${jakarta.variable}`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
