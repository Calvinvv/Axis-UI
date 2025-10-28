<template>
  <div class="demo-container">
    <h3>不同颜色</h3>
    <div class="demo-item">
      <div class="color-item">
        <AxIcon color="#ef4444">❤️</AxIcon>
        <span>红色</span>
      </div>
      <div class="color-item">
        <AxIcon color="#3b82f6">⭐</AxIcon>
        <span>蓝色</span>
      </div>
      <div class="color-item">
        <AxIcon color="#10b981">🌱</AxIcon>
        <span>绿色</span>
      </div>
      <div class="color-item">
        <AxIcon color="#f59e0b">☀️</AxIcon>
        <span>橙色</span>
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

.color-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.color-item span {
  font-size: 12px;
  color: #6b7280;
}

h3 {
  margin: 0 0 16px 0;
  color: #374151;
}
</style>
