const SUPPORTED = new Set(["USD", "NZD", "GBP", "AUD", "EUR", "INR", "CAD", "JPY"]);

// EU countries that use EUR but ip-api may return their local currency code
const EUROZONE: Record<string, string> = {
  AT: "EUR", BE: "EUR", CY: "EUR", EE: "EUR", FI: "EUR",
  FR: "EUR", DE: "EUR", GR: "EUR", IE: "EUR", IT: "EUR",
  LV: "EUR", LT: "EUR", LU: "EUR", MT: "EUR", NL: "EUR",
  PT: "EUR", SK: "EUR", SI: "EUR", ES: "EUR",
};

export async function GET(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "";

  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=countryCode,currency`,
      { headers: { "User-Agent": "HabitAI/1.0" }, cache: "no-store" },
    );
    const data = await res.json() as { countryCode?: string; currency?: string };
    const country  = data.countryCode ?? "US";
    const detected = EUROZONE[country] ?? data.currency ?? "USD";
    const currency = SUPPORTED.has(detected) ? detected : "USD";
    return Response.json({ currency, country });
  } catch {
    return Response.json({ currency: "USD", country: "US" });
  }
}
