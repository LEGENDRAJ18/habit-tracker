"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [logoHref, setLogoHref] = useState("/");

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (user) setLogoHref("/dashboard");
      });
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#09090f]/80 backdrop-blur-xl border-b border-violet-900/20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={logoHref} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-white">
              habit<span className="text-violet-400">AI</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="text-sm text-slate-400 hover:text-white transition-colors">
              Pricing
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center">
            <Link
              href="/auth/login"
              className="text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Open HabitAI
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-slate-400 hover:text-white p-1"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-[#0f0f1a] border-t border-violet-900/20 px-4 py-4 space-y-3">
          <Link
            href="#features"
            onClick={() => setOpen(false)}
            className="block text-slate-300 hover:text-white py-2 text-sm"
          >
            Features
          </Link>
          <Link
            href="#pricing"
            onClick={() => setOpen(false)}
            className="block text-slate-300 hover:text-white py-2 text-sm"
          >
            Pricing
          </Link>
          <div className="pt-2 border-t border-violet-900/20">
            <Link
              href="/auth/login"
              className="block text-center text-sm font-medium bg-violet-600 text-white rounded-lg py-2"
            >
              Open HabitAI
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
