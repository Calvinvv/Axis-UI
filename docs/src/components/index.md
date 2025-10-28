# 组件

Axis-UI 提供了丰富的 Vue 3 组件，支持 TypeScript 和完整的类型定义。

## 📦 组件列表

### 基础组件

- [Icon 图标](./icon) - 基于字体的图标组件

## 🚀 快速开始

### 安装

```bash
npm install @axis-ui/components
```

### 使用

```typescript
import { AxIcon } from '@axis-ui/components'

// 在组件中使用
<AxIcon :size="24" color="#3b82f6">🏠</AxIcon>
```

## 🎨 主题定制

所有组件都支持 CSS 变量定制：

```css
:root {
  --ax-color-primary: #3b82f6;
  --ax-color-secondary: #6b7280;
  --ax-border-radius: 4px;
}
```

## 📚 开发指南

- [组件开发规范](../guide/component-guidelines) - 了解组件开发最佳实践
- [TDD 开发流程](../guide/tdd-workflow) - 测试驱动开发指南
