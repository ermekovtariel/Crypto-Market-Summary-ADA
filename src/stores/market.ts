import { defineStore } from "pinia";
import { fetchCurrencies, fetchMarket } from "@/services/api";
import type { CurrencyMeta, MarketItem } from "@/types/api";

export const useMarketStore = defineStore("market", {
  state: () => ({
    currencies: [] as CurrencyMeta[],
    market: [] as MarketItem[],
    loadingMarket: false,
    error: null as string | null,
    lastUpdated: null as Date | null,
    intervalMs: 5000,
    _timer: null as number | null,
    _controller: null as AbortController | null,
    _retries: 0,
  }),
  getters: {
    isPolling: (state) => state._timer !== null,
    baseList: (s) => Array.from(new Set(s.market.map(m => m.base))).sort(),
    quoteList: (s) => Array.from(new Set(s.market.map(m => m.quote))).sort(),
    currencyIconMap: (s) => {
      const map: Record<string, string | undefined> = {};
      for (const c of s.currencies) map[c.code] = c.iconDataUrl;
      return map;
    },
  },
  actions: {
    async loadCurrencies() {
      try { this.currencies = await fetchCurrencies(); }
      catch (e: any) { this.error = e?.message ?? "Failed to load currencies"; }
    },
    async loadMarket() {
      this.loadingMarket = true;
      this.error = null;
      this._controller?.abort();
      const c = new AbortController(); this._controller = c;
      try {
        this.market = await fetchMarket(c.signal);
        this.lastUpdated = new Date();
        this._retries = 0;
      } catch (e: any) {
        this.error = e?.message ?? "Failed to load market";
        this._retries++;
      } finally { this.loadingMarket = false; }
    },
    startPolling(sec = 5000) {
      this.stopPolling();
      this.intervalMs = sec;
      const tick = async () => {
        if (document.hidden) return;
        await this.loadMarket();
        const backoff = this._retries ? Math.min(sec * 2 ** this._retries, 60000) : sec;
        this._timer = window.setTimeout(tick, backoff);
      };
      tick();
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden && !this._timer) this.startPolling(sec);
      }, { once: true });
    },
    stopPolling() {
      if (this._timer) clearTimeout(this._timer);
      this._timer = null;
      this._controller?.abort();
      this._retries = 0;
    },
  },
});
