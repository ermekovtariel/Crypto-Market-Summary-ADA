<script setup lang="ts">
defineOptions({ name: 'MarketTable' });

import { computed, ref } from "vue";
import type { MarketItem } from "@/types/api";
import { formatPrice, formatPct } from "@/utils/format";
import Sparkline from "@/components/Sparkline/index.vue";

const props = defineProps<{
  items: MarketItem[];
  q: string;
  base: string | null;
  quote: string | null;
}>();

type SortKey = "pair" | "price" | "change" | "volume";
const sortKey = ref<SortKey>("pair");
const sortDir = ref<1 | -1>(1);

function setSort(k: SortKey) {
  if (sortKey.value === k) {
    sortDir.value = (sortDir.value * -1) as 1 | -1;
  } else {
    sortKey.value = k;
    sortDir.value = 1;
  }
}

function sortIcon(k: SortKey) {
  if (sortKey.value !== k) return ""; 
  return sortDir.value === 1 ? "↑" : "↓";
}
function ariaSort(k: SortKey) {
  return sortKey.value === k ? (sortDir.value === 1 ? "ascending" : "descending") : "none";
}

const filtered = computed(() => {
  const q = props.q.trim().toLowerCase();
  return props.items.filter((it) => {
    const inQuery = !q || it.pair.toLowerCase().includes(q);
    const inBase = !props.base || it.base === props.base;
    const inQuote = !props.quote || it.quote === props.quote;
    return inQuery && inBase && inQuote;
  });
});

type Maybe<T> = T | null | undefined;
type MaybePrice = { price?: Maybe<number>; priceLast?: Maybe<number> };
type MaybeVolume = { volQuote?: Maybe<number>; volBase?: Maybe<number>; volume24h?: Maybe<number> };

function toNumberOrNegInf(v: Maybe<number>) { return v ?? Number.NEGATIVE_INFINITY; }
function pickPrice(m: MarketItem) {
  const mm = m as unknown as Partial<MaybePrice>;
  return toNumberOrNegInf(mm.priceLast ?? mm.price);
}
function pickVolume(m: MarketItem) {
  const mm = m as unknown as Partial<MaybeVolume>;
  return toNumberOrNegInf(mm.volQuote ?? mm.volBase ?? mm.volume24h);
}

const sorted = computed(() => {
  const k = sortKey.value;
  const dir = sortDir.value;
  return [...filtered.value].sort((a, b) => {
    const aPrice = pickPrice(a);
    const bPrice = pickPrice(b);
    const aVol = pickVolume(a);
    const bVol = pickVolume(b);

    const av = k === "pair" ? a.pair
      : k === "price" ? aPrice
      : k === "change" ? (a.changePct ?? Number.NEGATIVE_INFINITY)
      : aVol;

    const bv = k === "pair" ? b.pair
      : k === "price" ? bPrice
      : k === "change" ? (b.changePct ?? Number.NEGATIVE_INFINITY)
      : bVol;

    if (av === bv) return 0;
    return (av > bv ? 1 : -1) * dir;
  });
});

const opened = ref<string | null>(null);
function toggleRow(pair: string) {
  opened.value = opened.value === pair ? null : pair;
}

const COLS = 3; 
const isInitialEmpty = computed(() => props.items.length === 0);
const isFilteredEmpty = computed(() => filtered.value.length === 0);

</script>

<template>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th
            @click="setSort('pair')"
            :aria-sort="ariaSort('pair')"
            title="Сортировать по паре"
            class="px-4 py-3 cursor-pointer select-none text-black dark:text-white"
          >
            Pair
            <span :class="{ active: sortKey==='pair' }">{{ sortIcon('pair') }}</span>
          </th>

          <th
            @click="setSort('change')"
            :aria-sort="ariaSort('change')"
            title="Сортировать по изменению за 24ч"
            class="px-4 py-3 cursor-pointer select-none"
          >
            24h Change
            <span :class="{ active: sortKey==='change' }">{{ sortIcon('change') }}</span>
          </th>

          <th>Low/High</th>
        </tr>
      </thead>

      <tbody v-if="!isFilteredEmpty">
        <template v-for="it in sorted" :key="it.pair">
          <tr
            @click="toggleRow(it.pair)"
            class="row-main"
            :aria-expanded="opened === it.pair"
          >
            <td class="pair">
              <div class="pair-main">{{ it.base ?? '—' }} / {{ it.quote ?? '—' }}</div>
            </td>

            <td :class="{ up: (it.changePct ?? 0) > 0, down: (it.changePct ?? 0) < 0 }">
              {{ it.changePct == null ? '—' : formatPct(it.changePct) }}
            </td>

            <td class="hl">
              <span v-if="it.high24h != null && it.low24h != null">
                {{ formatPrice(it.low24h) }} — {{ formatPrice(it.high24h) }}
              </span>
              <span v-else>—</span>
            </td>
          </tr>

          <tr v-if="opened === it.pair">
            <td :colspan="COLS" class="expand-cell">
              <div class="expand-wrap">
                <div class="expand-title">
                  Динамика {{ it.pair }}
                  <span class="muted">({{ it.history?.length ?? 0 }} points)</span>
                </div>

                <div
                  :class="(it.history?.length ?? 0) > 1 && it.history[it.history.length - 1] >= it.history[0]
                    ? 'up'
                    : 'down'"
                >
                  <Sparkline :data="it.history ?? []" :height="72" :formatter="formatPrice" />
                </div>

                <div class="stats">
                  <div>Last: <span class="stat-strong">{{ formatPrice(pickPrice(it)) }}</span></div>
                  <div>Min: <span class="stat-strong">{{ formatPrice(it.low24h ?? null) }}</span></div>
                  <div>Max: <span class="stat-strong">{{ formatPrice(it.high24h ?? null) }}</span></div>
                </div>
              </div>
            </td>
          </tr>
        </template>
      </tbody>

      <tbody v-else>
        <tr>
          <td :colspan="COLS" class="empty">
            {{ isInitialEmpty ? 'Empty' : 'Not found' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped src="./MarketTable.scoped.css"></style>
