<script setup lang="ts">
import { computed, ref } from "vue";
import type { MarketItem } from "@/types/api";
import { formatPrice, formatPct, formatVol } from "@/utils/format";
import Sparkline from "@/components/Sparkline.vue";

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

// стрелка и aria-sort только для активной колонки
function sortIcon(k: SortKey) {
  if (sortKey.value !== k) return ""; // или верни "↕", если хочешь нейтральную стрелку
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

const sorted = computed(() => {
  const k = sortKey.value;
  const dir = sortDir.value;
  return [...filtered.value].sort((a, b) => {
    // устойчивость к разным наборам полей
    const aPrice = (a as any).priceLast ?? (a as any).price ?? Number.NEGATIVE_INFINITY;
    const bPrice = (b as any).priceLast ?? (b as any).price ?? Number.NEGATIVE_INFINITY;
    const aVol = (a as any).volQuote ?? (a as any).volBase ?? (a as any).volume24h ?? Number.NEGATIVE_INFINITY;
    const bVol = (b as any).volQuote ?? (b as any).volBase ?? (b as any).volume24h ?? Number.NEGATIVE_INFINITY;

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

// раскрытие строки с графиком
const opened = ref<string | null>(null);
function toggleRow(pair: string) {
  opened.value = opened.value === pair ? null : pair;
}
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

      <tbody>
        <!-- и основная, и раскрытая строки — внутри одного template v-for -->
        <template v-for="it in sorted" :key="it.pair">
          <!-- основная строка -->
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

          <!-- раскрытая строка: динамика/спарклайн -->
          <tr v-if="opened === it.pair">
            <td :colspan="3" class="expand-cell">
              <div class="expand-wrap">
                <div class="expand-title">
                  Динамика {{ it.pair }}
                  <span class="muted">({{ it.history?.length ?? 0 }} точек)</span>
                </div>

                <div
                  :class="(it.history?.length ?? 0) > 1 && it.history[it.history.length - 1] >= it.history[0]
                    ? 'up'
                    : 'down'"
                >
                  <Sparkline :data="it.history ?? []" :height="72" :formatter="formatPrice" />
                </div>

                <div class="stats">
                  <div>Last: <span class="stat-strong">{{ formatPrice((it as any).priceLast ?? (it as any).price ?? null) }}</span></div>
                  <div>Min: <span class="stat-strong">{{ formatPrice(it.low24h ?? null) }}</span></div>
                  <div>Max: <span class="stat-strong">{{ formatPrice(it.high24h ?? null) }}</span></div>
                </div>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.table-wrap { border: 1px solid #e6e8eb; border-radius: 12px; overflow: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: .65rem .75rem; border-bottom: 1px solid #f0f2f4; text-align: left; }
th { background: #fbfbfc; font-weight: 600; cursor: pointer; white-space: nowrap; color: #000; }
th span { opacity: .2; margin-left: .25rem; }
th span.active { opacity: .9; }


.row-main:hover td {
  background: #fff;
  transition: background .2s, color .2s;
  cursor: pointer;
  font-weight: 600;
  font-size: 1.10rem;
}

.pair-main { font-weight: 600; }
.pair-sub { opacity: .6; font-size: .85rem; }
.up { color: #13854e !important; }
.down { color: #b42318 !important; }
.hl { white-space: nowrap; }

/* раскрытый блок */
.expand-cell { padding: .75rem; background: #f6f8fa; }
.expand-wrap { display: grid; gap: .5rem; }
.expand-title { font-weight: 600; }
.muted { opacity: .65; font-weight: 400; }
.stats { display: flex; gap: 1rem; font-size: .85rem; opacity: .9; }
.stat-strong { font-weight: 600; color: #111; }

@media (prefers-color-scheme: dark) {
  th { background: #0f1115; color: #fff; }
  td { border-color: #1a1d23; }
  .row-main:hover td { background: #0d0e12; color: inherit; }
  .expand-cell { background: #0b0d11; }
  .stat-strong { color: #eee; }
}
</style>
