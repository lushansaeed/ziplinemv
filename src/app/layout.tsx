import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

// Brand font: Agrandir (commercial) → Plus Jakarta Sans as open-source equivalent
// Modern geometric sans — used for all UI, body copy, navigation
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
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
