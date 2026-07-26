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
    // ip-api.com is a free, unauthenticated, occasionally slow third-party
    // service — bound it so a hung/slow lookup can't stall the response for
    // 10+ seconds; the client falls back to USD either way on failure.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3_000);
    let res: Response;
    try {
      res = await fetch(
        `http://ip-api.com/json/${ip}?fields=countryCode,currency`,
        { headers: { "User-Agent": "HabitAI/1.0" }, cache: "no-store", signal: controller.signal },
      );
    } finally {
      clearTimeout(timeout);
    }
    const data = await res.json() as { countryCode?: string; currency?: string };
    const country  = data.countryCode ?? "US";
    const detected = EUROZONE[country] ?? data.currency ?? "USD";
    const currency = SUPPORTED.has(detected) ? detected : "USD";
    // Geolocation-by-IP is stable for a given client for a long time — let
    // the browser/CDN cache the response instead of re-resolving on every load.
    return Response.json({ currency, country }, {
      headers: { "Cache-Control": "private, max-age=86400" },
    });
  } catch {
    return Response.json({ currency: "USD", country: "US" });
  }
}
