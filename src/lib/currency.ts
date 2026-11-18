/**
 * Which currency to show a visitor. Prices themselves live in plan_prices (one row per currency);
 * if there's no row in the visitor's currency, USD is shown, then whatever exists.
 */
const EURO = ["AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK"];

const BY_COUNTRY: Record<string, string> = {
  US: "USD", GB: "GBP", IN: "INR", CA: "CAD", AU: "AUD", NZ: "NZD", SG: "SGD", AE: "AED", JP: "JPY",
  BR: "BRL", MX: "MXN", ZA: "ZAR", CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", KR: "KRW",
  ...Object.fromEntries(EURO.map((c) => [c, "EUR"])),
};

export function currencyForCountry(country: string | null | undefined): string {
  return (country && BY_COUNTRY[country.toUpperCase()]) || "USD";
}

/** Pick the prices to show: the preferred currency if any exist, else USD, else everything. */
export function pickPrices<T extends { currency: string }>(prices: T[], preferred: string): T[] {
  const inPreferred = prices.filter((p) => p.currency === preferred);
  if (inPreferred.length) return inPreferred;
  const usd = prices.filter((p) => p.currency === "USD");
  return usd.length ? usd : prices;
}

/** Locale for number formatting that matches the currency (e.g. ₹1,99,900 vs £1,999). */
export function localeForCurrency(currency: string): string {
  return ({ INR: "en-IN", GBP: "en-GB", EUR: "en-IE", AUD: "en-AU", CAD: "en-CA", NZD: "en-NZ", SGD: "en-SG", JPY: "ja-JP" } as Record<string, string>)[currency] ?? "en-US";
}
