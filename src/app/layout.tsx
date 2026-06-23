import type { Metadata } from "next";
import { Syne, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://zipline.mv";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    template: "%s | Zipline Maldives",
    default:  "Zipline Maldives — Maldives' First Island-to-Island Zipline",
  },
  description:
    "Drop in by zipline. Leave with a story. 428 metres of ocean, adrenaline, and unforgettable views from Maafushi to Vahmāfushi. Book your island-to-island zipline experience today.",
  keywords: [
    "zipline maldives", "maafushi zipline", "vahmaafushi", "maldives adventure",
    "island zipline", "maafushi activities", "maldives experiences",
    "island hopping maldives", "adventure maldives",
  ],
  authors:  [{ name: "Zipline Maldives" }],
  creator:  "Zipline Maldives",
  publisher:"Zipline Maldives",
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
    creator:     "@ziplinemaldives",
    title:       "Zipline Maldives",
    description: "Drop in by zipline. Leave with a story.",
    images:      ["/og-image.jpg"],
  },
  robots: {
    index:            true,
    follow:           true,
    googleBot: { index: true, follow: true },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${syne.variable} ${inter.variable} font-body antialiased`}>
        {children}
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            style: {
              fontFamily: "var(--font-body)",
            },
          }}
        />
      </body>
    </html>
  );
}
