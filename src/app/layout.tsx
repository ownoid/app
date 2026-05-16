import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ownoid",
  description: "AI humanoid design platform — coming soon",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
