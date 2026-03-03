import type { Metadata } from "next";
import Link from "next/link";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LinkedLocke",
  description: "Trust-based Soul Link tracker for two players",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased`}>
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-8">
          <main className="flex-1">{children}</main>
          <footer className="mt-10 border-t border-slate-200/70 pt-4 text-xs text-slate-500">
            <Link href="/credits" className="underline decoration-slate-300 underline-offset-4">
              Credits and IP Notice
            </Link>
          </footer>
        </div>
      </body>
    </html>
  );
}
