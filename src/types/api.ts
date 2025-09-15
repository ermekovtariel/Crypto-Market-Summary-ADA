import { z } from "zod";

/** Строчные/числовые поля приходят строками — бережно парсим */
export const numberish = z.union([z.number(), z.string()]).transform((v) => {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : NaN;
});

/* ---------- Currency (metadata) ---------- */
export const CurrencyMetaSchema = z.object({
  code: z.string(),                 // "Aud"
  sort_order: z.number().optional(),
  ticker: z.string().optional(),
  type: z.string().optional(),
  decimals_places: z.number().int().optional(),
  icon: z.string().optional(),      // base64 svg (без префикса data:)
}).passthrough();

export type CurrencyMetaRaw = z.infer<typeof CurrencyMetaSchema>;

export interface CurrencyMeta {
  code: string;               // "AUD"
  ticker?: string;            // "AUD"
  type?: string;
  decimals?: number;          // из decimals_places
  sortOrder?: number;
  iconDataUrl?: string;       // data:image/svg+xml;base64,....
}

export function normalizeCurrencyMeta(a: CurrencyMetaRaw): CurrencyMeta {
  const code = (a.code || a.ticker || "—").toUpperCase();
  const ticker = a.ticker ? a.ticker.toUpperCase() : undefined;
  return {
    code,
    ticker,
    type: a.type,
    decimals: a.decimals_places,
    sortOrder: a.sort_order,
    iconDataUrl: a.icon ? `data:image/svg+xml;base64,${a.icon}` : undefined,
  };
}

export const CurrencyMetaArraySchema = z.array(CurrencyMetaSchema);

/* ---------- Market (quotes) ---------- */
const MarketDirectionSchema = z.enum(["Up", "Down"]).optional();

const MarketChangeSchema = z.object({
  direction: MarketDirectionSchema,            // "Up" | "Down"
  percent: numberish.optional(),               // "3.87"
  amount: numberish.optional(),                // "6182.77"
}).passthrough();

const MarketPriceSchema = z.object({
  last: numberish.optional(),                  // "153263.48"
  bestBid: numberish.optional(),
  bestOffer: numberish.optional(),
  change: MarketChangeSchema.optional(),
}).passthrough();

const MarketPairSchema = z.object({
  primary: z.string(),                          // "Xbt"
  secondary: z.string(),                        // "Aud"
}).passthrough();

const MarketVolumeSchema = z.object({
  primary: numberish.optional(),                // "31.21"
  secondary: numberish.optional(),              // "4848923.39"
}).passthrough();

export const MarketRawSchema = z.object({
  pair: MarketPairSchema,
  price: MarketPriceSchema,
  volume: MarketVolumeSchema.optional(),
  priceHistory: z.array(numberish).optional(),  // ["156149.98", ...]
}).passthrough();

export type MarketRaw = z.infer<typeof MarketRawSchema>;
export const MarketArraySchema = z.array(MarketRawSchema);

/** Нормализованный элемент для UI */
export interface MarketItem {
  pair: string;              // "XBT-AUD"
  base: string;              // "XBT"
  quote: string;             // "AUD"

  priceLast: number | null;
  bid: number | null;
  ask: number | null;

  changePct: number | null;  // со знаком, по direction
  changeAmt: number | null;  // со знаком
  changeDir: "up" | "down" | null;

  volBase: number | null;    // volume.primary
  volQuote: number | null;   // volume.secondary

  history: number[];         // массив чисел (без NaN)
  low24h: number | null;     // min(history) или null
  high24h: number | null;    // max(history) или null
}

export function normalizeMarketItem(r: MarketRaw): MarketItem {
  const base = r.pair.primary?.toUpperCase?.() ?? r.pair.primary;
  const quote = r.pair.secondary?.toUpperCase?.() ?? r.pair.secondary;
  const pair = `${base}-${quote}`;

  const last = Number.isFinite(r.price.last as number) ? Number(r.price.last) : null;
  const bid  = Number.isFinite(r.price.bestBid as number) ? Number(r.price.bestBid) : null;
  const ask  = Number.isFinite(r.price.bestOffer as number) ? Number(r.price.bestOffer) : null;

  let pct: number | null = null;
  let amt: number | null = null;
  let dir: "up" | "down" | null = null;

  if (r.price.change) {
    const rawPct = Number(r.price.change.percent);
    const rawAmt = Number(r.price.change.amount);
    const sign = r.price.change.direction === "Down" ? -1 : 1;
    dir = r.price.change.direction === "Down" ? "down" : "up";
    pct = Number.isFinite(rawPct) ? sign * rawPct : null;
    amt = Number.isFinite(rawAmt) ? sign * rawAmt : null;
  }

  const volBase  = Number.isFinite(r.volume?.primary as number)   ? Number(r.volume?.primary)   : null;
  const volQuote = Number.isFinite(r.volume?.secondary as number) ? Number(r.volume?.secondary) : null;

  const hist = (r.priceHistory ?? [])
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));
  const low = hist.length ? Math.min(...hist) : null;
  const high = hist.length ? Math.max(...hist) : null;

  return {
    pair,
    base,
    quote,
    priceLast: last,
    bid,
    ask,
    changePct: pct,
    changeAmt: amt,
    changeDir: dir,
    volBase,
    volQuote,
    history: hist,
    low24h: low,
    high24h: high,
  };
}
