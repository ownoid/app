import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-fraunces",
  display: "swap",
});

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
    <html lang="en" className={fraunces.variable}>
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
