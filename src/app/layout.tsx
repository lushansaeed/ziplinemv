export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://zipline.mv";

// generateMetadata is the CORRECT Next.js API for dynamic favicons.
// Unlike <link> tags rendered in components (which get removed during
// client-side navigation reconciliation), metadata icons persist across
// all navigations because Next.js manages them outside React's tree.
export async function generateMetadata(): Promise<Metadata> {
  // Use the static ICO file — it has proper 16x16/24x24 square icons.
  // The CMS logo is wide (389x145) and not suitable as a favicon.
  const icon = "/favicon.ico";

  return {
    metadataBase: new URL(BASE),
    title: {
      template: "%s | Zipline Maldives",
      default:  "Zipline Maldives — Maldives' First Island-to-Island Zipline",
    },
    description:
      "Drop in by zipline. Leave with a story. 428 metres of ocean, adrenaline, and unforgettable views from Maafushi to Vahmāfushi.",
    keywords: [
      "zipline maldives", "maafushi zipline", "vahmaafushi", "maldives adventure",
      "island zipline", "maafushi activities", "maldives experiences",
    ],
    authors:   [{ name: "Zipline Maldives" }],
    creator:   "Zipline Maldives",
    publisher: "Zipline Maldives",
    icons: {
      icon:             [{ url: icon }],
      shortcut:         [{ url: icon }],
      apple:            [{ url: icon }],
    },
    openGraph: {
      type:      "website",
      locale:    "en_US",
      url:       BASE,
      siteName:  "Zipline Maldives",
      title:     "Zipline Maldives — Maldives' First Island-to-Island Zipline",
      description: "Drop in by zipline. Leave with a story. 428 metres of ocean, adrenaline, and unforgettable views.",
      images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Zipline Maldives" }],
    },
    twitter: {
      card:        "summary_large_image",
      site:        "@ziplinemaldives",
      title:       "Zipline Maldives",
      description: "Drop in by zipline. Leave with a story.",
      images:      ["/og-image.jpg"],
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/Kindness-Matters.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${jakarta.variable} font-body antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            style: { fontFamily: "var(--font-body)" },
          }}
        />
      </body>
    </html>
  );
}
