"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export const SUPPORTED_CURRENCIES = ["USD", "NZD", "GBP", "AUD", "EUR", "INR", "CAD", "JPY"] as const;
export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number];

const CURRENCY_META: Record<CurrencyCode, { symbol: string; decimals: number; label: string }> = {
  USD: { symbol: "$",  decimals: 2, label: "$ USD" },
  NZD: { symbol: "$",  decimals: 2, label: "$ NZD" },
  GBP: { symbol: "£",  decimals: 2, label: "£ GBP" },
  AUD: { symbol: "$",  decimals: 2, label: "$ AUD" },
  EUR: { symbol: "€",  decimals: 2, label: "€ EUR" },
  INR: { symbol: "₹",  decimals: 0, label: "₹ INR" },
  CAD: { symbol: "$",  decimals: 2, label: "$ CAD" },
  JPY: { symbol: "¥",  decimals: 0, label: "¥ JPY" },
};

const FALLBACK_RATES: Record<CurrencyCode, number> = {
  USD: 1, NZD: 1.67, GBP: 0.79, AUD: 1.57, EUR: 0.92, INR: 83.5, CAD: 1.36, JPY: 155,
};

const PREF_KEY  = "habitai_currency";
const RATES_KEY = "habitai_rates";
const RATES_TTL = 3_600_000; // 1 hour

// Psychological pricing: decimal currencies → X.99; zero-decimal → X9 or round-to-10
function psychoPrice(converted: number, decimals: number): string {
  if (decimals === 2) {
    // e.g. 11.47 → 11.99, 7.00 → 6.99, 12.00 → 11.99
    const price = Math.ceil(converted) - 0.01;
    return price.toFixed(2);
  }
  // Zero-decimal currencies (INR, JPY, etc.)
  if (converted < 1000) {
    // Nearest X9 ending: 582 → 579, 245 → 249
    const price = Math.floor(converted / 10) * 10 - 1;
    return Math.max(price, 9).toLocaleString();
  }
  // Large amounts: round to nearest 10 for a clean look
  return (Math.round(converted / 10) * 10).toLocaleString();
}

// Returns the full formatted price string: e.g. "$11.99 NZD" or "$6.99"
export function buildFullPrice(usd: number, code: CurrencyCode, rates: Record<string, number>): string {
  const meta = CURRENCY_META[code];
  const rate = (rates[code] as number | undefined) ?? FALLBACK_RATES[code];
  const amount = psychoPrice(usd * rate, meta.decimals);
  const suffix = code !== "USD" ? ` ${code}` : "";
  return `${meta.symbol}${amount}${suffix}`;
}

// Returns split parts for big-number display: main = "$11.99", suffix = "NZD"
export function buildPriceParts(usd: number, code: CurrencyCode, rates: Record<string, number>): { main: string; suffix: string } {
  const meta = CURRENCY_META[code];
  const rate = (rates[code] as number | undefined) ?? FALLBACK_RATES[code];
  const amount = psychoPrice(usd * rate, meta.decimals);
  return { main: `${meta.symbol}${amount}`, suffix: code };
}

interface CurrencyCtx {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatPrice: (usd: number) => string;
  priceParts: (usd: number) => { main: string; suffix: string };
  rates: Record<string, number>;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyCtx>({
  currency: "USD",
  setCurrency: () => {},
  formatPrice: (usd) => buildFullPrice(usd, "USD", FALLBACK_RATES),
  priceParts:  (usd) => buildPriceParts(usd, "USD", FALLBACK_RATES),
  rates: FALLBACK_RATES,
  loading: true,
});

async function loadRates(): Promise<Record<string, number>> {
  try {
    const raw = localStorage.getItem(RATES_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as { rates: Record<string, number>; ts: number };
      if (Date.now() - cached.ts < RATES_TTL) return cached.rates;
    }
  } catch {}

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    const data = await res.json() as { result: string; rates?: Record<string, number> };
    if (data.result === "success" && data.rates) {
      try { localStorage.setItem(RATES_KEY, JSON.stringify({ rates: data.rates, ts: Date.now() })); } catch {}
      return data.rates;
    }
  } catch {}

  return FALLBACK_RATES;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");
  const [rates, setRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      let code: CurrencyCode = "USD";
      try {
        const saved = localStorage.getItem(PREF_KEY);
        if (saved && (SUPPORTED_CURRENCIES as readonly string[]).includes(saved)) {
          code = saved as CurrencyCode;
        } else {
          const res = await fetch("/api/geo-currency");
          const data = await res.json() as { currency: string };
          if ((SUPPORTED_CURRENCIES as readonly string[]).includes(data.currency)) {
            code = data.currency as CurrencyCode;
          }
        }
      } catch {}

      const loadedRates = await loadRates();
      if (!cancelled) {
        setCurrencyState(code);
        setRates(loadedRates);
        setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    try { localStorage.setItem(PREF_KEY, c); } catch {}
  };

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      formatPrice: (usd) => buildFullPrice(usd, currency, rates),
      priceParts:  (usd) => buildPriceParts(usd, currency, rates),
      rates,
      loading,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

export const CURRENCY_LABELS = SUPPORTED_CURRENCIES.map((c) => ({
  code: c,
  label: CURRENCY_META[c].label,
}));
