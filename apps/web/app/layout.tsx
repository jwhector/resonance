import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resonance",
  description: "Find and support what resonates with you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
