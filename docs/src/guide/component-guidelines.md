# 组件开发规范

本文档详细说明了 Axis-UI 组件库的开发规范，包括组件设计原则、代码规范、测试要求和文档标准。

## 🎯 设计原则

### 1. 单一职责原则

每个组件应该只负责一个功能，保持组件的简洁性和可维护性。

```typescript
// ✅ 好的设计
<AxButton>Click me</AxButton>
<AxIcon>home</AxIcon>

// ❌ 避免的设计
<AxButtonWithIcon icon="home">Click me</AxButtonWithIcon>
```

### 2. 可复用性原则

组件应该可以在不同场景下复用，通过 props 控制行为。

```typescript
// ✅ 可复用的设计
<AxButton type="primary" size="large">Primary</AxButton>
<AxButton type="secondary" size="small">Secondary</AxButton>
```

### 3. 可组合性原则

组件应该可以与其他组件组合使用，形成更复杂的功能。

```typescript
// ✅ 可组合的设计
<AxCard>
  <AxCardHeader>
    <AxIcon>star</AxIcon>
    <AxTitle>Card Title</AxTitle>
  </AxCardHeader>
  <AxCardContent>
    <AxButton>Action</AxButton>
  </AxCardContent>
</AxCard>
```

## 📁 目录结构

```
packages/components/
├── button/                    # 组件目录
│   ├── src/
│   │   ├── button.vue        # 组件实现
│   │   ├── button.ts         # 组件逻辑
│   │   └── types.ts          # 类型定义
│   ├── index.ts              # 导出文件
│   └── package.json          # 包配置
├── icon/
│   ├── src/
│   │   ├── icon.vue
│   │   └── icon.ts
│   ├── index.ts
│   └── package.json
└── index.ts                  # 主入口文件
```

## 🏗️ 组件结构

### 1. Vue 组件模板

```vue
<template>
  <div :class="classes" :style="styles" @click="handleClick">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { buttonProps } from './button'

// 定义组件名称
defineOptions({
  name: 'AxButton',
})

// 定义 props
const props = defineProps(buttonProps)

// 定义 emits
const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

// 计算属性
const classes = computed(() => {
  return [
    'ax-button',
    `ax-button--${props.type}`,
    `ax-button--${props.size}`,
    {
      'ax-button--disabled': props.disabled,
    },
  ]
})

// 事件处理
const handleClick = (event: MouseEvent) => {
  if (props.disabled) return
  emit('click', event)
}
</script>
```

### 2. TypeScript 类型定义

```typescript
// button.ts
import type { ExtractPropTypes } from 'vue'

export const buttonProps = {
  type: {
    type: String as PropType<'primary' | 'secondary' | 'danger'>,
    default: 'primary',
  },
  size: {
    type: String as PropType<'small' | 'medium' | 'large'>,
    default: 'medium',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
} as const

export type ButtonProps = ExtractPropTypes<typeof buttonProps>
```

### 3. 样式规范

```scss
// button.scss
.ax-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;

  // 尺寸变体
  &--small {
    padding: 4px 8px;
    font-size: 12px;
  }

  &--medium {
    padding: 8px 16px;
    font-size: 14px;
  }

  &--large {
    padding: 12px 24px;
    font-size: 16px;
  }

  // 类型变体
  &--primary {
    background-color: var(--ax-color-primary);
    color: white;

    &:hover {
      background-color: var(--ax-color-primary-hover);
    }
  }

  &--secondary {
    background-color: var(--ax-color-secondary);
    color: var(--ax-color-text);

    &:hover {
      background-color: var(--ax-color-secondary-hover);
    }
  }

  // 状态
  &--disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
```

## 🧪 测试规范

### 1. 测试文件结构

```typescript
// test/components/button/button.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AxButton from '@packages/components/button/src/button.vue'

describe('AxButton', () => {
  // 基础渲染测试
  it('renders correctly', () => {
    const wrapper = mount(AxButton, {
      slots: { default: 'Click me' },
    })
    expect(wrapper.text()).toBe('Click me')
    expect(wrapper.classes()).toContain('ax-button')
  })

  // Props 测试
  it('applies type prop correctly', () => {
    const wrapper = mount(AxButton, {
      props: { type: 'secondary' },
    })
    expect(wrapper.classes()).toContain('ax-button--secondary')
  })

  // 事件测试
  it('emits click event when clicked', async () => {
    const wrapper = mount(AxButton)
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  // 状态测试
  it('does not emit click when disabled', async () => {
    const wrapper = mount(AxButton, {
      props: { disabled: true },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeFalsy()
  })

  // 快照测试
  it('matches snapshot', () => {
    const wrapper = mount(AxButton, {
      props: { type: 'primary', size: 'large' },
      slots: { default: 'Click me' },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })
})
```

### 2. 测试覆盖率要求

- **行覆盖率**: ≥ 80%
- **分支覆盖率**: ≥ 80%
- **函数覆盖率**: ≥ 80%
- **语句覆盖率**: ≥ 80%

## 📚 文档规范

### 1. 组件文档结构

````markdown
# Button 按钮

按钮组件用于触发操作。

## 基础用法

<demo src="./demos/basic.vue"></demo>

## 不同尺寸

<demo src="./demos/sizes.vue"></demo>

## 不同类型

<demo src="./demos/types.vue"></demo>

## API

### Props

| 参数     | 说明     | 类型                                 | 默认值    |
| -------- | -------- | ------------------------------------ | --------- |
| type     | 按钮类型 | 'primary' \| 'secondary' \| 'danger' | 'primary' |
| size     | 按钮尺寸 | 'small' \| 'medium' \| 'large'       | 'medium'  |
| disabled | 是否禁用 | boolean                              | false     |

### Events

| 事件名 | 说明     | 参数                |
| ------ | -------- | ------------------- |
| click  | 点击事件 | (event: MouseEvent) |

### Slots

| 插槽名  | 说明     |
| ------- | -------- |
| default | 按钮内容 |

## 源码

<details>
<summary>查看源码</summary>

```vue
<!-- 组件源码 -->
</details>
```
````

### 2. 演示文件规范

```vue
<!-- demos/basic.vue -->
<template>
  <div class="demo-container">
    <h3>基础用法</h3>
    <div class="demo-item">
      <AxButton>Default</AxButton>
      <AxButton type="primary">Primary</AxButton>
      <AxButton type="secondary">Secondary</AxButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import AxButton from '@packages/components/button/src/button.vue'
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
```

## 🔧 开发工具

### 1. 代码检查

```bash
# ESLint 检查
pnpm lint

# 自动修复
pnpm lint:fix

# TypeScript 类型检查
pnpm type-check
```

### 2. 代码格式化

```bash
# Prettier 格式化
pnpm format

# 检查格式
pnpm format:check
```

### 3. 测试工具

```bash
# 运行测试
pnpm test

# 监听模式
pnpm test:watch

# 覆盖率报告
pnpm test:coverage

# UI 模式
pnpm test:ui
```

## 📦 发布规范

### 1. 版本管理

使用 [Semantic Versioning](https://semver.org/) 规范：

- **MAJOR**: 不兼容的 API 修改
- **MINOR**: 向下兼容的功能性新增
- **PATCH**: 向下兼容的问题修正

### 2. 变更日志

每次发布都应该更新 `CHANGELOG.md`：

```markdown
## [1.1.0] - 2024-01-15

### Added

- 新增 Button 组件的 loading 状态
- 新增 Icon 组件的自定义颜色支持

### Changed

- 优化 Button 组件的样式
- 更新 Icon 组件的默认尺寸

### Fixed

- 修复 Button 组件在禁用状态下的点击事件
- 修复 Icon 组件的样式继承问题
```

### 3. 发布流程

```bash
# 1. 更新版本号
pnpm version patch  # 或 minor, major

# 2. 构建包
pnpm build

# 3. 发布到 npm
pnpm publish

# 4. 创建 Git 标签
git tag v1.1.0
git push origin v1.1.0
```

## 🎓 最佳实践

### 1. 组件设计

- **保持简单**: 组件应该简单易懂
- **单一职责**: 每个组件只做一件事
- **可预测性**: 组件行为应该可预测
- **可测试性**: 组件应该易于测试

### 2. 性能优化

- **懒加载**: 大型组件使用懒加载
- **虚拟滚动**: 长列表使用虚拟滚动
- **防抖节流**: 频繁操作使用防抖节流
- **内存管理**: 及时清理事件监听器

### 3. 可访问性

- **语义化**: 使用语义化的 HTML 标签
- **键盘导航**: 支持键盘导航
- **屏幕阅读器**: 支持屏幕阅读器
- **颜色对比**: 确保足够的颜色对比度

### 4. 国际化

- **文本外部化**: 所有文本都应该外部化
- **RTL 支持**: 支持从右到左的语言
- **日期格式**: 支持不同的日期格式
- **数字格式**: 支持不同的数字格式
