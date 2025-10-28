<template>
  <div class="demo-container">
    <h3>不同尺寸</h3>
    <div class="demo-item">
      <div class="size-item">
        <AxIcon :size="16">🏠</AxIcon>
        <span>16px</span>
      </div>
      <div class="size-item">
        <AxIcon :size="24">🏠</AxIcon>
        <span>24px</span>
      </div>
      <div class="size-item">
        <AxIcon :size="32">🏠</AxIcon>
        <span>32px</span>
      </div>
      <div class="size-item">
        <AxIcon :size="48">🏠</AxIcon>
        <span>48px</span>
      </div>
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
  gap: 24px;
  align-items: center;
}

.size-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.size-item span {
  font-size: 12px;
  color: #6b7280;
}

h3 {
  margin: 0 0 16px 0;
  color: #374151;
}
</style>
