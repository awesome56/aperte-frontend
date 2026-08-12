<script setup lang="ts">
defineProps<{ count?: number; height?: string }>()
</script>

<template>
  <div class="skel-card" :style="{ height: height || '340px' }" aria-hidden="true">
    <div class="skel-img"></div>
    <div class="skel-body">
      <div class="skel-line w40"></div>
      <div class="skel-line w80"></div>
      <div class="skel-line w60"></div>
    </div>
  </div>
</template>

<style scoped>
.skel-card {
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
  border: 1px solid #eef0f3;
}

.skel-img,
.skel-line {
  background: linear-gradient(90deg, #f0f1f3 25%, #e4e6ea 37%, #f0f1f3 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}

.skel-img {
  height: 100%;
}

.skel-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skel-line {
  height: 14px;
  border-radius: 6px;
}

.w40 { width: 40%; }
.w60 { width: 60%; }
.w80 { width: 80%; }

@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skel-img,
  .skel-line {
    animation: none;
  }
}
</style>
