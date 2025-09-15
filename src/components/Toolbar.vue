<script setup lang="ts">
import { ref, watch } from "vue";
import { useMarketStore } from "@/stores/market";

const store = useMarketStore();

const q = defineModel<string>("q", { default: "" });
const base = defineModel<string | null>("base", { default: null });
const quote = defineModel<string | null>("quote", { default: null });

const interval = ref(store.intervalMs.toString());

watch(interval, (v) => {
  const ms = Number(v);
  if (Number.isFinite(ms) && ms >= 1000) {
    store.startPolling(ms);
  }
});
</script>

<template>
  <div class="toolbar">
    <input class="ctrl search" v-model="q" placeholder="Поиск по паре (например, XBT-AUD)" />

    <select class="ctrl base" v-model="base">
      <option :value="null">Base: All</option>
      <option v-for="b in store.baseList" :key="b" :value="b">{{ b }}</option>
    </select>

    <!-- <select class="ctrl quote" v-model="quote">
      <option :value="null">Quote: All</option>
      <option v-for="q in store.quoteList" :key="q" :value="q">{{ q }}</option>
    </select> -->

    <label class="ctrl interval">
      <span class="interval-label">Polling (ms):</span>
      <input v-model="interval" type="number" min="1000" step="500" />
    </label>

    <button class="ctrl refresh" @click="store.loadMarket()">Refresh</button>

    <span class="ctrl status" v-if="store.lastUpdated">
      Last updated: {{ new Date(store.lastUpdated).toLocaleTimeString() }}
    </span>
  </div>
</template>

<style scoped>
/* базовые контролы */
.ctrl { min-height: 40px; }
input, select, button {
  padding: .5rem .65rem;
  border: 1px solid #d0d7de;
  color: #676363;
  border-radius: 8px;
  background: #fff;
}
button { cursor: pointer; border-color: transparent; background: #3b82f6; color: #fff; }
button:hover { filter: brightness(0.95); }
.interval { display: flex; gap: .5rem; align-items: center; }
.interval input { width: 120px; }
.interval-label { white-space: nowrap; opacity: .85; }
.status { opacity: .8; font-size: .9rem; }

/* GRID-области: удобно менять раскладку под брейкпоинты */
.toolbar {
  display: grid;
  grid-template-columns: 1.2fr 0.6fr 0.6fr auto auto auto;
  grid-template-areas:
    "search base interval refresh status";
  gap: .5rem;
  align-items: center;
}

/* привязка элементов к областям */
.search  { grid-area: search; }
.base    { grid-area: base; }
.interval{ grid-area: interval; }
.refresh { grid-area: refresh; }
.status  { grid-area: status; justify-self: end; }

/* ====== адаптив ====== */

/* планшеты / узкие ноуты */
@media (max-width: 1024px) {
  .toolbar {
    grid-template-columns: 1fr 1fr 1fr 1fr;
    grid-template-areas:
      "search search search search"
      "base   base   interval refresh"
      "status status  status   status";
  }
  .status { justify-self: start; margin-top: .25rem; }
}

/* мобильные ≥ 640px → две колонки */
@media (max-width: 640px) {
  .toolbar {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      "search search"
      "base   base"
      "interval refresh"
      "status status";
  }
  input, select, button { width: 100%; }  /* тянуться на всю ширину ячейки */
  .interval input { width: 100%; }       /* число — тоже резиновое */
  .status { font-size: .85rem; }
}

/* маленькие телефоны — одна колонка */
@media (max-width: 420px) {
  .toolbar {
    grid-template-columns: 1fr;
    grid-template-areas:
      "search"
      "base"
      "interval"
      "refresh"
      "status";
  }
  .status { justify-self: start; }
}

/* удобочитаемость на touch-экранах */
@media (pointer: coarse) {
  .ctrl { min-height: 44px; } /* Apple рекомендация по высоте тача */
}
</style>
