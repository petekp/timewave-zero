import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Timewave Zero",
  description: "A faithful recreation of Peter Meyer's Timewave Zero 4.22 for MS-DOS, the program that graphed Terence McKenna's timewave.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
