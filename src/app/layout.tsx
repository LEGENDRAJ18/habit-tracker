import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";
import InstallBanner from "@/components/pwa/InstallBanner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://habitai.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "HabitAI – Build Habits That Actually Stick",
    template: "%s | HabitAI",
  },
  description:
    "AI-powered habit tracking with streak protection, personalized coaching and weekly insights.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HabitAI",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon-192.svg", sizes: "192x192" }],
    shortcut: "/icons/icon-192.svg",
  },
  openGraph: {
    title: "HabitAI – Build Habits That Actually Stick",
    description:
      "AI-powered habit tracking with streak protection, personalized coaching and weekly insights.",
    url: APP_URL,
    siteName: "HabitAI",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "HabitAI",
      },
    ],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "HabitAI – Build Habits That Actually Stick",
    description:
      "AI-powered habit tracking with streak protection, personalized coaching and weekly insights.",
    images: ["/opengraph-image"],
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {children}
        <ServiceWorkerRegistration />
        <InstallBanner />
      </body>
    </html>
  );
}
