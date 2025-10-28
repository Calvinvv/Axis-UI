# Icon 图标

基于字体的图标组件，支持自定义大小和颜色。

## 基础用法

<demo src="./demos/basic.vue"></demo>

## 不同尺寸

<demo src="./demos/sizes.vue"></demo>

## 不同颜色

<demo src="./demos/colors.vue"></demo>

## API

### Props

| 参数  | 说明             | 类型     | 默认值 |
| ----- | ---------------- | -------- | ------ |
| size  | 图标大小（像素） | `number` | -      |
| color | 图标颜色         | `string` | -      |

### Slots

| 插槽名  | 说明     |
| ------- | -------- |
| default | 图标内容 |

## 使用示例

```vue
<template>
  <AxIcon :size="24" color="#3b82f6"> 🏠 </AxIcon>
</template>

<script setup>
import AxIcon from '@packages/components/icon/src/icon.vue'
</script>
```
