import type { Metadata } from "next";
import { ThemeScript } from "@/components/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zipline Maldives | The World's Most Beautiful Zipline",
  description:
    "Book the Maldives' first island-to-island zipline from Maafushi to Vahmaafushi Picnic Island.",
  metadataBase: new URL("https://zipline.mv")
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
