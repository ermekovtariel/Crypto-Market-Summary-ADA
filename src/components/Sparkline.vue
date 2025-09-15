<script setup lang="ts">
import { computed, ref } from "vue";

const props = withDefaults(defineProps<{
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  showArea?: boolean;
  /** Кастомный форматтер (например, formatPrice) */
  formatter?: (v: number) => string;
}>(), {
  width: 360,
  height: 72,
  strokeWidth: 2,
  showArea: true,
});

const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 8 });
const fmt = (v: number) => props.formatter ? props.formatter(v) : nf.format(v);

// базовые расчёты
const minVal = computed(() => props.data.length ? Math.min(...props.data) : 0);
const maxVal = computed(() => props.data.length ? Math.max(...props.data) : 1);
const range = computed(() => Math.max(1e-9, maxVal.value - minVal.value));

const pts = computed(() => {
  const n = props.data.length;
  if (n < 2) return [] as { x: number; y: number }[];
  return props.data.map((v, i) => ({
    x: (i / (n - 1)) * props.width,
    y: props.height - ((v - minVal.value) / range.value) * props.height,
  }));
});

const path = computed(() => {
  if (pts.value.length < 2) return "";
  return "M " + pts.value.map(p => `${p.x} ${p.y}`).join(" L ");
});

const areaPath = computed(() => {
  if (pts.value.length < 2) return "";
  const first = pts.value[0];
  const last = pts.value[pts.value.length - 1];
  return `M ${first.x} ${props.height} L ${pts.value.map(p => `${p.x} ${p.y}`).join(" L ")} L ${last.x} ${props.height} Z`;
});

// ===== Ховер прямо под курсором =====
const hoverX = ref<number | null>(null); // координата X курсора в системе viewBox

function getLocalX(e: MouseEvent | TouchEvent) {
  const svg = e.currentTarget as SVGElement;
  const rect = svg.getBoundingClientRect();
  const clientX = (e as TouchEvent).touches?.[0]?.clientX ?? (e as MouseEvent).clientX;
  const x = clientX - rect.left;                   // пиксели элемента
  const ratio = x / rect.width;                    // 0..1
  return Math.max(0, Math.min(1, ratio)) * props.width; // в координатах viewBox
}

function onMove(e: MouseEvent | TouchEvent) {
  hoverX.value = getLocalX(e);
}
function onLeave() {
  hoverX.value = null;
}

// линейная интерполяция значения по X курсора
const hoverValue = computed(() => {
  if (hoverX.value == null || props.data.length === 0) return null;
  const n = props.data.length;
  if (n === 1) return props.data[0];

  const t = (hoverX.value / props.width) * (n - 1); // 0..n-1
  const i = Math.floor(t);
  const f = t - i;

  if (i >= n - 1) return props.data[n - 1];
  const v0 = props.data[i];
  const v1 = props.data[i + 1];
  return v0 + (v1 - v0) * f;
});

const hoverY = computed(() => {
  if (hoverValue.value == null) return null;
  return props.height - ((hoverValue.value - minVal.value) / range.value) * props.height;
});

// тултип: позиционируем относительно курсора
const tooltipText = computed(() => hoverValue.value == null ? "" : fmt(hoverValue.value));
const tipW = computed(() => Math.max(40, tooltipText.value.length * 7 + 12));
const tipH = 22;
const tipX = computed(() => {
  if (hoverX.value == null) return 0;
  const x = hoverX.value - tipW.value / 2;
  return Math.max(0, Math.min(props.width - tipW.value, x));
});
const tipY = computed(() => {
  if (hoverY.value == null) return 0;
  // ставим «чуть ниже» курсора; если не помещается — над курсором
  const below = hoverY.value + 10;
  const above = hoverY.value - tipH - 10;
  return below + tipH <= props.height ? below : Math.max(0, above);
});
</script>

<template>
  <svg
    :viewBox="`0 0 ${width} ${height}`"
    preserveAspectRatio="none"
    class="w-full h-[72px] select-none"
    style="cursor: crosshair"
    @mousemove="onMove"
    @touchstart.passive="onMove"
    @touchmove.passive="onMove"
    @mouseleave="onLeave"
    @touchend="onLeave"
  >
    <rect :width="width" :height="height" fill="transparent" />

    <path v-if="showArea" :d="areaPath" fill="currentColor" opacity="0.12"/>
    <path :d="path" fill="none" stroke="currentColor" :stroke-width="strokeWidth" vector-effect="non-scaling-stroke"/>

    <!-- линия и маркер ПОД курсором -->
    <template v-if="hoverX != null && hoverY != null">
      <line
        :x1="hoverX" :x2="hoverX" y1="0" :y2="height"
        stroke="currentColor" opacity="0.35" stroke-width="1"
        vector-effect="non-scaling-stroke" pointer-events="none"
      />
      <circle :cx="hoverX" :cy="hoverY" r="3.5" fill="currentColor" pointer-events="none" />
    </template>

    <!-- тултип (пилюля) под курсором -->
    <g v-if="hoverX != null && hoverY != null && tooltipText" pointer-events="none">
      <rect :x="tipX" :y="tipY" :width="tipW" :height="tipH" rx="6" ry="6" fill="#000" opacity="0.85" />
      <text
        :x="tipX + tipW / 2" :y="tipY + tipH / 2 + 4"
        text-anchor="middle" fill="#fff" font-size="12"
        font-family="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial"
      >
        {{ tooltipText }}
      </text>
    </g>
  </svg>
</template>
