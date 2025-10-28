<template>
  <div class="demo-container">
    <h3>插槽内容</h3>
    <div class="demo-item">
      <AxIcon :size="24" color="#3b82f6">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
          />
        </svg>
      </AxIcon>
      <AxIcon :size="24" color="#ef4444">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        </svg>
      </AxIcon>
      <AxIcon :size="24" color="#10b981">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
          />
        </svg>
      </AxIcon>
    </div>
  </div>
</template>

<script setup lang="ts">
import AxIcon from '@packages/components/icon/src/icon.vue'
</script>

<style scoped>
.demo-container {
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin: 16px 0;
}

.demo-item {
  display: flex;
  gap: 16px;
  align-items: center;
}

h3 {
  margin: 0 0 16px 0;
  color: #374151;
}
</style>
