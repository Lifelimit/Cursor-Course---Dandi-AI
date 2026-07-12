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
  description: "README-grounded public repository summaries and source-backed questions over repositories you explicitly prepare.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Dandi AI",
    description: "README-grounded public repository summaries and source-backed prepared-repository questions.",
    url: "/",
    siteName: "Dandi AI",
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
