import {
  CurrencyMetaArraySchema,
  MarketArraySchema,
  normalizeCurrencyMeta,
  normalizeMarketItem,
  type CurrencyMeta,
  type MarketItem,
} from "@/types/api";

const DEV = import.meta.env.DEV;
const BASE = DEV ? "" : (import.meta.env.VITE_API_BASE?.replace(/\/+$/, "") || "");

const endpoints = {
  currency: DEV ? "/api/currency" : "/api/currency", //"/test/api/currency",
  market:   DEV ? "/api/market"   : "/api/market" //"/test/api/market",
};

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new ApiError(`HTTP ${res.status} ${res.statusText}`, res.status);
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ([] as unknown as T);
}

export async function fetchCurrencies(signal?: AbortSignal): Promise<CurrencyMeta[]> {
  const data = await getJson<unknown>(endpoints.currency, signal);
  const parsed = CurrencyMetaArraySchema.safeParse(data);
  if (!parsed.success) {
    console.warn("Currency schema mismatch:", parsed.error);
    return [];
  }
  return parsed.data.map(normalizeCurrencyMeta);
}

export async function fetchMarket(signal?: AbortSignal): Promise<MarketItem[]> {
  const data = await getJson<unknown>(endpoints.market, signal);
  const parsed = MarketArraySchema.safeParse(data);
  if (!parsed.success) {
    console.warn("Market schema mismatch:", parsed.error);
    return [];
  }
  return parsed.data.map(normalizeMarketItem);
}
