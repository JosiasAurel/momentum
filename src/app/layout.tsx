import type { Metadata } from "next";
import { Bricolage_Grotesque, Fraunces, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "@/app/globals.css";

const title = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-title",
});

const app = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-app",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Momentum",
    template: "%s | Momentum",
  },
  description:
    "Momentum is a garden-inspired personal execution workspace for projects, tasks, devlogs, reminders, and public progress updates.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${title.variable} ${app.variable} ${mono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
