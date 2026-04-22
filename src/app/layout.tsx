import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";
import InstallBanner from "@/components/pwa/InstallBanner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "habitAI — Build Better Habits with AI",
  description:
    "AI-powered habit tracking that adapts to your lifestyle. Track, analyse, and optimise your daily habits with intelligent insights.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HabitAI",
  },
  icons: {
    apple: "/icons/icon-192.svg",
    icon: "/icons/icon-512.svg",
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
