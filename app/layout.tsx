import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://datenightconcierge.app";
const description =
  "Tell us the vibe and the budget. We plan the whole night by hand and text you the itinerary — no app, no accounts.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Date Night Concierge — planned by hand, texted to you",
    template: "%s · Date Night Concierge",
  },
  description,
  keywords: [
    "date night",
    "date planner",
    "concierge",
    "date ideas",
    "night out",
    "couples",
  ],
  applicationName: "Date Night Concierge",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Date Night Concierge",
    title: "Date Night Concierge — planned by hand, texted to you",
    description,
  },
  twitter: {
    card: "summary",
    title: "Date Night Concierge",
    description,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1024",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
