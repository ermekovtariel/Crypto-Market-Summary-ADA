<script setup lang="ts">
defineOptions({ name: 'MarketToolbar' });

import { ref, watch } from "vue";
import { useMarketStore } from "@/stores/market";
// import "./styles.css";
// import styles from "./index.module.css";

const store = useMarketStore();

const q = defineModel<string>("q", { default: "" });
const base = defineModel<string | null>("base", { default: null });

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
    <input class="ctrl search" v-model="q" placeholder="Search..." />

    <select class="ctrl base" v-model="base">
      <option :value="null">Base: All</option>
      <option v-for="b in store.baseList" :key="b" :value="b">{{ b }}</option>
    </select>

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

<style scoped src="./Toolbar.scoped.css"></style>
