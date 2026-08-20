import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NinaivuNet — Automated Meeting Intelligence & Governance",
  description: "An AI-powered enterprise meeting intelligence platform that aggregates audio streams, transcribes dialogues, maps collaboration indexes, and preserves organizational memory under zero-trust governance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
      style={{ scrollBehavior: "smooth" }}
    >
      <body className="min-h-full bg-[#05070D] text-[#F5F6FA] font-sans antialiased overflow-x-hidden selection:bg-[#6C5CE7]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
