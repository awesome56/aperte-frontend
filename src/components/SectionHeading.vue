<script setup lang="ts">
defineProps<{ label?: string; title?: string; link?: string; count?: number }>()
</script>

<template>
  <div class="sec-head">
    <div>
      <span v-if="label" class="section-label">{{ label }}</span>
      <h2 class="section-title">{{ title }}</h2>
    </div>
    <RouterLink v-if="link" :to="link" class="sec-link">View all →</RouterLink>
  </div>
</template>

<style scoped>
.sec-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}

.section-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--color-primary, #0a84ff);
  text-transform: uppercase;
  margin-bottom: 6px;
}

.section-title {
  font-size: clamp(1.5rem, 2.5vw, 2rem);
  font-weight: 700;
  color: var(--color-dark, #1c1c1c);
  line-height: 1.2;
}

.sec-link {
  color: var(--color-primary, #0a84ff);
  font-weight: 600;
  font-size: 0.92rem;
  white-space: nowrap;
}

.sec-link:hover {
  text-decoration: underline;
}

@media (max-width: 600px) {
  .sec-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
