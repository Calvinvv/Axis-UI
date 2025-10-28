<template>
  <div class="demo-container">
    <h3>基础用法</h3>
    <div class="demo-item">
      <AxIcon>🏠</AxIcon>
      <AxIcon>⭐</AxIcon>
      <AxIcon>❤️</AxIcon>
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
  font-size: 24px;
}

h3 {
  margin: 0 0 16px 0;
  color: #374151;
}
</style>
