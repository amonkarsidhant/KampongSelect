import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KampongSelect",
  description: "Weekend availability and XI selection for Kampong Cricket Club",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
