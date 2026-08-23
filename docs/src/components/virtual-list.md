# VirtualList 虚拟列表

用于高效渲染大量数据的虚拟滚动列表组件，支持固定高度和动态高度两种模式。

## 概述

当需要渲染大量数据时，传统的渲染方式会创建大量 DOM 节点，导致页面卡顿。虚拟列表通过只渲染可见区域的元素来解决这个问题。

## 基础用法（固定高度）

每项高度相同时，传入 `size` 指定固定高度：

<demo src="./demos/virtual-list/Basic.vue"></demo>

## 动态高度

每项高度不同时，传入 `estimatedSize` 指定预估高度，组件自动测量真实高度：

<demo src="./demos/virtual-list/DynamicHeight.vue"></demo>

## 工作原理

### 固定高度模式（`size > 0`）

1. **可视区域计算**：根据容器高度和 `size` 计算可见项数量
2. **滚动监听**：`scrollTop / size` 直接算出起始索引
3. **偏移量计算**：通过 CSS `transform` 来模拟滚动位置
4. **缓冲区**：在可见区域上下各保留一屏数据，防止快速滚动时出现空白

### 动态高度模式（`estimatedSize > 0`）

1. **预估渲染**：首次渲染使用 `estimatedSize` 作为每项高度
2. **自动测量**：通过 `ResizeObserver` 监测每项的真实高度并缓存
3. **二分查找**：滚动时使用 O(log n) 的二分查找定位起始索引
4. **高度收敛**：随着用户滚动，越来越多的项被测量，滚动条高度逐步逼近真实值

## API

### Props

| 参数          | 说明                                                  | 类型     | 默认值 |
| ------------- | ----------------------------------------------------- | -------- | ------ |
| items         | 列表数据                                              | `any[]`  | `[]`   |
| size          | 每项的固定高度（px）。传 > 0 启用固定高度模式         | `number` | `0`    |
| estimatedSize | 预估高度（px）。`size` 为 0 时传 > 0 启用动态高度模式 | `number` | `0`    |
| remain        | 可见区域显示的项数                                    | `number` | `8`    |

### 模式判断

| `size` | `estimatedSize` | 模式                 |
| ------ | --------------- | -------------------- |
| > 0    | 任意            | 固定高度（向后兼容） |
| 0      | > 0             | 动态高度             |
| 0      | 0               | 回退到默认 32px      |

### Slots

| 插槽名  | 说明             | 参数            |
| ------- | ---------------- | --------------- |
| default | 自定义列表项内容 | `{ node: any }` |

## 使用示例

### 固定高度

```vue
<template>
  <AxVirtualList :items="items" :remain="10" :size="50">
    <template #default="{ node }">
      <div class="item">{{ node.name }}</div>
    </template>
  </AxVirtualList>
</template>

<script setup>
const items = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  name: `Item ${i + 1}`,
}))
</script>
```

### 动态高度

```vue
<template>
  <AxVirtualList :items="items" :remain="8" :estimatedSize="60">
    <template #default="{ node }">
      <div class="item">
        <h4>{{ node.title }}</h4>
        <p>{{ node.content }}</p>
      </div>
    </template>
  </AxVirtualList>
</template>

<script setup>
const items = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  title: `Item ${i + 1}`,
  content: '描述文字'.repeat(Math.floor(Math.random() * 5) + 1),
}))
</script>
```

### 定位到指定索引

组件实例暴露 `scrollToIndex(index, alignment?)`，用于日志、Trace 等大列表从业务标识映射到数组索引后定位。`alignment` 支持 `auto`、`start`、`center` 和 `end`，默认 `auto`：条目已完整可见时不滚动。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { VirtualListExpose } from 'axis-ui'

const listRef = ref<VirtualListExpose>()

function revealDiagnostic(index: number) {
  listRef.value?.scrollToIndex(index, 'center')
}
</script>

<template>
  <AxVirtualList ref="listRef" :items="items" :size="32" :remain="12">
    <template #default="{ node }">{{ node.label }}</template>
  </AxVirtualList>
</template>
```

`scrollToIndex` 只处理通用列表坐标，不理解 ACP Sequence。DevTools 应先用自己的 Trace/Event 索引把 `sequence` 转成当前筛选结果中的数组下标，再调用组件方法；这样协议语义不会进入 Axis-UI。

## 注意事项

> [!IMPORTANT]
> 固定高度模式下，每个列表项的实际高度必须与 `size` 一致，否则滚动计算会出现偏差。

> [!TIP]
> 动态高度模式下，`estimatedSize` 越接近真实平均高度，首次渲染的滚动条位置越准确。

> [!TIP]
> 合理设置 `remain` 值，一般等于容器能显示的完整项数即可。过大会增加不必要的渲染。
