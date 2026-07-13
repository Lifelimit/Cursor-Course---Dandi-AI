import type { Metadata } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";
import "./globals.css";
import { getURL } from "@/lib/utils/url-helper";

const geistSans = localFont({
  src: "./fonts/geist-sans-latin.woff2",
  variable: "--font-geist-sans",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(getURL()),
  title: "Dandi AI — Repository Intelligence API",
  description:
    "Production-oriented developer platform for public repository intelligence, RAG workflows, API access, usage controls, and subscription billing.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Dandi AI — Repository Intelligence API",
    description:
      "Public repository summaries, retrieval-based questioning, API key management, usage monitoring, and Stripe billing in one workspace.",
    url: "/",
    siteName: "Dandi AI",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dandi AI — Repository Intelligence API",
    description:
      "Full-stack AI developer platform for repository intelligence, RAG, API access, and billing.",
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
