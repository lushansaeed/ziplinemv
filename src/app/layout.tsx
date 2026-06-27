export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Raleway } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body-base",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const raleway = Raleway({
  subsets: ["latin"],
  variable: "--font-raleway",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://zipline.mv";
const ICON_VERSION = "v=2";

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(BASE),
    applicationName: "Zipline Maldives",
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
    manifest:  `/site.webmanifest?${ICON_VERSION}`,
    icons: {
      icon: [
        { url: `/favicon.ico?${ICON_VERSION}` },
        { url: `/favicon-16x16.png?${ICON_VERSION}`, sizes: "16x16", type: "image/png" },
        { url: `/favicon-32x32.png?${ICON_VERSION}`, sizes: "32x32", type: "image/png" },
        { url: `/android-chrome-192x192.png?${ICON_VERSION}`, sizes: "192x192", type: "image/png" },
        { url: `/android-chrome-512x512.png?${ICON_VERSION}`, sizes: "512x512", type: "image/png" },
      ],
      shortcut: [{ url: `/favicon.ico?${ICON_VERSION}` }],
      apple: [
        { url: `/apple-touch-icon.png?${ICON_VERSION}`, sizes: "180x180", type: "image/png" },
      ],
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
      <body className={`${jakarta.variable} ${raleway.variable} font-body antialiased`}>
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
