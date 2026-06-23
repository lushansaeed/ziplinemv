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

export const metadata: Metadata = {
  title: {
    template: "%s | Zipline Maldives",
    default: "Zipline Maldives — Maldives' First Island-to-Island Zipline",
  },
  description:
    "Drop in by zipline. Leave with a story. 428 metres of ocean, adrenaline, and unforgettable views from Maafushi to Vahmāfushi.",
  keywords: [
    "zipline maldives",
    "maafushi zipline",
    "vahmaafushi",
    "maldives adventure",
    "island zipline",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Zipline Maldives",
  },
  twitter: {
    card: "summary_large_image",
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
