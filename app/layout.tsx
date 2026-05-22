import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/shared/header";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://voice2prompt.vercel.app"),
  title: "Voice2Prompt — Turn speech into AI-ready prompts",
  description:
    "Turn messy spoken ideas into structured AI-ready prompts. Record your voice, analyze intent, and generate production-ready prompts in seconds.",
  openGraph: {
    title: "Voice2Prompt — Turn speech into AI-ready prompts",
    description:
      "Turn messy spoken ideas into structured AI-ready prompts. Record your voice, analyze intent, and generate production-ready prompts in seconds.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <Header />
        <main className="flex-1 pt-14">{children}</main>
        <footer className="border-t border-zinc-800/50 py-6">
          <div className="max-w-5xl mx-auto px-4 sm:px-8 flex items-center justify-between">
            <p className="text-xs text-zinc-600">
              Voice2Prompt &mdash; Built with Next.js
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                GitHub
              </a>
              <a
                href="/history"
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                History
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
