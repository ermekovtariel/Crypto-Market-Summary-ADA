<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useMarketStore } from "@/stores/market";
import Toolbar from "@/components/Toolbar.vue";
import MarketTable from "@/components/MarketTable.vue";

const store = useMarketStore();

const q = ref("");
const base = ref<string | null>(null);

onMounted(async () => {
  await store.loadCurrencies(); // не блокируем UI, но полезно для списков
  await store.loadMarket();
  store.startPolling(5000);
});
</script>

<template>
  <main class="container">
    <header>
      <h1>Crypto Market Summary</h1>
      <p>Vue 3 • TypeScript • Pinia • Real-time</p>
    </header>

    <Toolbar v-model:q="q" v-model:base="base"  />

    <section class="panel" v-if="store.error">
      <div class="error">
        <strong>Error:</strong> {{ store.error }}
      </div>
    </section>

    <section class="panel">
      <div class="market_table_status">
        <div v-if="store.loadingMarket">Data is loading…</div>
        <div v-else>Ready</div>
        <div class="meta">
          Polling: <strong>{{ store.pollState }}</strong>,
          interval: <strong>{{store.intervalMs}}ms</strong>
        </div>
      </div>
      <MarketTable
        :items="store.market"
        :q="q"
        :base="base"
      />
    </section>
  </main>
</template>

<style scoped>
.container { max-width: 1100px; margin: 2rem auto; padding: 0 1rem; }
header { margin-bottom: 1rem; }
h1 { margin: 0; }
.panel { margin-top: 1rem; }
.error { padding: .75rem 1rem; background: #fff1f0; color: #a8071a; border: 1px solid #ffa39e; border-radius: 10px; }
.market_table_status { display: flex; justify-content: space-between; padding: .5rem 0; opacity: .8; font-size: .9rem; }
</style>
