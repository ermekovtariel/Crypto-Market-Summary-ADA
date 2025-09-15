export const nf = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 8,
});

export const nfFiat = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function formatPrice(n: number | null) {
  if (n == null || Number.isNaN(n)) return "—";
  // если цена меньше 1 — покажем до 8 знаков, иначе 2
  return n < 1 ? n.toFixed(8).replace(/0+$/, "").replace(/\.$/, "") : nf.format(n);
}

export function formatPct(n: number | null) {
  if (n == null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function formatVol(n: number | null) {
  if (n == null || Number.isNaN(n)) return "—";
  // сокращения: K, M, B
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return nf.format(n);
}
