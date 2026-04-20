"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, LogOut, Zap, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FREE_HABIT_LIMIT } from "@/types";

interface Props {
  habitCount: number;
}

export default function DashboardNav({ habitCount }: Props) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isAtLimit = habitCount >= FREE_HABIT_LIMIT;

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-40 bg-[#09090f]/90 backdrop-blur-xl border-b border-violet-900/20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-white text-sm">
              habit<span className="text-violet-400">AI</span>
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {isAtLimit && (
              <Link
                href="#"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-600/30 text-violet-300 text-xs font-medium rounded-lg transition-all"
              >
                <Zap className="w-3 h-3" />
                Upgrade to Pro
              </Link>
            )}

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-violet-950/50 text-slate-400 hover:text-white transition-all text-xs"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">U</span>
                </div>
                <ChevronDown className="w-3 h-3" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-[#0f0f1a] border border-violet-900/30 rounded-xl shadow-xl shadow-violet-950/40 py-1 z-50">
                  {isAtLimit && (
                    <button className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-violet-300 hover:bg-violet-950/50 transition-colors sm:hidden">
                      <Zap className="w-3.5 h-3.5" />
                      Upgrade to Pro
                    </button>
                  )}
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-400 hover:text-white hover:bg-violet-950/50 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
