import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dandi AI — Repository Intelligence API",
  description: "The high-performance API layer for summarizing codebases, tracking metadata, and distilling repository insights in seconds.",
  openGraph: {
    title: "Dandi AI",
    description: "The high-performance API layer for summarizing codebases.",
    url: "https://dandi.ai",
    siteName: "Dandi AI",
    images: [
      {
        url: "https://dandi.ai/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Dandi AI Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}

