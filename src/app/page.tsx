import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";

// Lazy-load below-fold sections — keeps the initial JS bundle focused on the hero
const Features    = dynamic(() => import("@/components/landing/Features"));
const SocialProof = dynamic(() => import("@/components/landing/SocialProof"));
const Community   = dynamic(() => import("@/components/landing/Community"));
const Pricing     = dynamic(() => import("@/components/landing/Pricing"));
const Footer      = dynamic(() => import("@/components/landing/Footer"));

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://habitai.app";

export const metadata: Metadata = {
  title: "HabitAI – Build Habits That Actually Stick",
  description:
    "AI-powered habit tracking with streak protection, personalized coaching and weekly insights. Join 10,000+ people building better habits every day.",
  metadataBase: new URL(APP_URL),
  alternates: { canonical: "/" },
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
        alt: "HabitAI – Build Habits That Actually Stick",
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
};

export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Features />
      <SocialProof />
      <Community />
      <Pricing />
      <Footer />
    </main>
  );
}
