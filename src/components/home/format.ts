/** Shared number formatting for home market components — tabular, honest decimals. */

export function fmtPrice(value: number, currency: "USD" | "ZMW" | string): string {
  const symbol = currency === "ZMW" ? "K" : "$";
  const decimals = value >= 1000 ? 2 : value >= 1 ? 2 : 4;
  return `${symbol}${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function fmtChange(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}
