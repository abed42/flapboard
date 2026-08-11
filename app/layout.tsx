import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { BoardGate } from "@/components/board-gate";
import { FullscreenToggle } from "@/components/fullscreen-toggle";
import { SoundToggle } from "@/components/sound-toggle";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Flapboard",
  description:
    "A live split-flap signup board powered by Next.js and Supabase.",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <BoardGate />
          <SoundToggle />
          <FullscreenToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
