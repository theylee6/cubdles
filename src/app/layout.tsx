import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { publicEnv } from "@/lib/env";
import "./globals.css";
import { RegisterServiceWorker } from "@/features/push/register-sw";

// Self-hosted variable fonts (no runtime request to Google).
const fraunces = localFont({
  src: [
    { path: "../fonts/fraunces.woff2", style: "normal" },
    { path: "../fonts/fraunces-italic.woff2", style: "italic" },
  ],
  variable: "--font-fraunces",
  display: "swap",
  weight: "100 900",
});

const figtree = localFont({
  src: "../fonts/figtree.woff2",
  variable: "--font-figtree",
  display: "swap",
  weight: "300 900",
});

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "Cubdles — dating for people who love closeness",
    template: "%s · Cubdles",
  },
  description:
    "Cubdles (said “cuddles”) is a warm, safe dating app for adults who value affection. Share how you like to be close, and meet people who feel the same.",
  applicationName: "Cubdles",
  openGraph: {
    type: "website",
    siteName: "Cubdles",
    locale: "en_US",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#FBF7F2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-cream text-cocoa">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
