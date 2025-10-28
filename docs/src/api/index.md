# API 参考

Axis-UI 组件的完整 API 文档。

## 📋 组件 API

### Icon 图标

#### Props

| 参数  | 说明             | 类型     | 默认值 |
| ----- | ---------------- | -------- | ------ |
| size  | 图标大小（像素） | `number` | -      |
| color | 图标颜色         | `string` | -      |

#### Slots

| 插槽名  | 说明     |
| ------- | -------- |
| default | 图标内容 |

#### 类型定义

```typescript
interface IconProps {
  size?: number
  color?: string
}
```

## 🔧 工具函数

### withInstall

用于为组件添加安装方法的工具函数。

```typescript
import { withInstall } from '@axis-ui/utils'

const AxIcon = withInstall(Icon)
```

## 📦 导出

### 组件导出

```typescript
// 完整导入
import { AxIcon } from '@axis-ui/components'

// 按需导入
import AxIcon from '@axis-ui/components/icon'
```

### 类型导出

```typescript
import type { IconProps } from '@axis-ui/components'
```

## 🎯 使用示例

### 基础用法

```vue
<template>
  <AxIcon :size="24" color="#3b82f6"> 🏠 </AxIcon>
</template>

<script setup lang="ts">
import { AxIcon } from '@axis-ui/components'
</script>
```

### 动态属性

```vue
<template>
  <AxIcon :size="iconSize" :color="iconColor">
    {{ iconName }}
  </AxIcon>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { AxIcon } from '@axis-ui/components'

const iconSize = ref(24)
const iconColor = ref('#3b82f6')
const iconName = ref('🏠')
</script>
```
