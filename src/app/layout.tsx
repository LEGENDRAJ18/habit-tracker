// HabitAI v1.1 - Latest build
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";
import InstallBanner from "@/components/pwa/InstallBanner";
import ToastContainer from "@/components/ui/Toast";
import CookieBanner from "@/components/ui/CookieBanner";
import { AppearanceProvider } from "@/contexts/AppearanceContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import ConditionalAppShell from "@/components/layout/ConditionalAppShell";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://habitai.app";

const OG_TITLE       = "HabitAI - AI Habit Coaching That Actually Works";
const OG_DESCRIPTION = "Track habits, protect streaks, and get personalised AI coaching. Join thousands building better habits with HabitAI — free forever.";
const OG_IMAGE       = `${APP_URL}/opengraph-image`;

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: OG_TITLE,
    template: "%s | HabitAI",
  },
  description: OG_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HabitAI",
  },
  icons: {
    icon: [
      { url: "/favicon.ico",        sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/apple-icon.svg",     sizes: "180x180", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title:       OG_TITLE,
    description: OG_DESCRIPTION,
    url:         APP_URL,
    siteName:    "HabitAI",
    images: [
      {
        url:    OG_IMAGE,
        width:  1200,
        height: 630,
        alt:    "HabitAI – AI Habit Coaching That Actually Works",
      },
    ],
    type:   "website",
    locale: "en_US",
  },
  twitter: {
    card:        "summary_large_image",
    title:       OG_TITLE,
    description: OG_DESCRIPTION,
    images:      [OG_IMAGE],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} scroll-smooth`}>
      <body>
        <AppearanceProvider>
          <CurrencyProvider>
            <ConditionalAppShell>
              {children}
            </ConditionalAppShell>
          </CurrencyProvider>
        </AppearanceProvider>
        <Analytics />
        <ServiceWorkerRegistration />
        <InstallBanner />
        <ToastContainer />
        <CookieBanner />
      </body>
    </html>
  );
}
