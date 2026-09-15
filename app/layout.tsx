import type { Metadata, Viewport } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-theme drives the whole palette. It is hardcoded to midnight until
    // the couple-setup step lands and can persist a choice; every token is
    // already a variable, so switching it is a one-attribute change.
    <html
      lang="en"
      data-theme="midnight"
      className={`${playfair.variable} ${jakarta.variable}`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
