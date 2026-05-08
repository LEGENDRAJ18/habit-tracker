"use client";

import { ChevronDown } from "lucide-react";
import { useCurrency, CURRENCY_LABELS, type CurrencyCode } from "@/contexts/CurrencyContext";

interface Props {
  className?: string;
  align?: "left" | "center" | "right";
}

export default function CurrencySelector({ className, align = "left" }: Props) {
  const { currency, setCurrency, loading } = useCurrency();

  if (loading) return null;

  return (
    <div className={`relative inline-flex items-center gap-0.5 ${align === "center" ? "mx-auto" : ""} ${className ?? ""}`}>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
        aria-label="Select display currency"
        className="appearance-none bg-transparent text-slate-500 hover:text-slate-300 text-xs font-medium pl-1 pr-5 py-1 cursor-pointer transition-colors focus:outline-none"
      >
        {CURRENCY_LABELS.map(({ code, label }) => (
          <option key={code} value={code} className="bg-[#0f0f1a] text-slate-200">
            {label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-0 w-3 h-3 text-slate-500 pointer-events-none" />
    </div>
  );
}
