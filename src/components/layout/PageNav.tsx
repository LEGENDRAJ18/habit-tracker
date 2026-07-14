"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

interface Props {
  emoji:     string;
  title:     string;
  subtitle:  string;
  maxWidth?: string;
  action?:   React.ReactNode;
}

export default function PageNav({
  emoji,
  title,
  subtitle,
  maxWidth = "max-w-5xl",
  action,
}: Props) {
  return (
    <>
      {/* Sticky breadcrumb header — sits below DashboardNav (h-14 mobile / h-16 desktop) */}
      <div className="sticky top-14 sm:top-16 z-30 bg-[#09090f]/90 backdrop-blur-xl border-b border-violet-900/20">
        <div className={`${maxWidth} mx-auto px-4 sm:px-6 h-14 flex items-center gap-2`}>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-slate-500 hover:text-white text-xs transition-colors py-1.5 px-2 -ml-2 rounded-lg hover:bg-violet-950/40 flex-shrink-0 min-h-[44px]"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="font-medium">Dashboard</span>
          </Link>
          <span className="text-slate-700 text-sm">/</span>
          <span className="text-sm font-semibold text-white">{emoji} {title}</span>
          {action && <div className="ml-auto flex-shrink-0">{action}</div>}
        </div>
      </div>

      {/* Page hero */}
      <div className={`${maxWidth} mx-auto px-4 sm:px-6 pt-8 pb-3`}>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          {emoji} {title}
        </h1>
        <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>
      </div>
    </>
  );
}
