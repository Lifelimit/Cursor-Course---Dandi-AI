import type { Metadata } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/geist-sans-latin.woff2",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Nonce-based CSP requires request-time rendering so Next can attach the
  // proxy-generated nonce to its framework scripts and inline payloads.
  await headers();

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
