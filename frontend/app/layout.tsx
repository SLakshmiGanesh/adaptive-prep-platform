import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adaptive Prep Platform — AI-Powered Exam Preparation",
  description:
    "Adaptive learning platform for JEE, NEET, GATE, UPSC, CAT. Powered by Bayesian Knowledge Tracing, IRT quizzes, and RAG-based AI tutoring.",
  keywords: ["JEE", "NEET", "GATE", "UPSC", "CAT", "adaptive learning", "AI tutor"],
  authors: [{ name: "Adaptive Prep Platform" }],
};

export const viewport: Viewport = {
  themeColor: "#050507",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700;800;900&family=Geist+Mono:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
