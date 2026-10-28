import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { AuthProvider } from "@/lib/authContext";
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: "Interview Prep Tracker | Daily Progress & Streaks",
  description: "Track daily DSA, JavaScript, React and CS fundamentals interview prep with streaks, activity heatmaps, and syllabus targets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
