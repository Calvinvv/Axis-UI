# Axis-UI

<p align="center">
  <strong>一个现代化、轻量级的 Vue 3 组件库</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@axis-ui/components"><img src="https://img.shields.io/npm/v/@axis-ui/components.svg" alt="npm version"></a>
  <a href="https://github.com/Calvinvv/Axis-UI/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@axis-ui/components.svg" alt="license"></a>
  <a href="https://github.com/Calvinvv/Axis-UI"><img src="https://img.shields.io/github/stars/Calvinvv/Axis-UI?style=social" alt="GitHub stars"></a>
</p>

## ✨ 特性

- 🚀 基于 Vue 3 + TypeScript 开发
- 📦 支持 ES Module 和 UMD 两种格式
- 🎨 完整的 TypeScript 类型定义
- 🔧 支持按需引入和全量引入
- 💪 使用 Vite 构建，体积小、速度快
- 📐 遵循工程化最佳实践

## 📦 安装

```bash
# 使用 pnpm
pnpm add @axis-ui/components

# 使用 npm
npm install @axis-ui/components

# 使用 yarn
yarn add @axis-ui/components
```

## 🔨 使用

### 全量引入

```typescript
import { createApp } from 'vue'
import AxisUI from '@axis-ui/components'
import '@axis-ui/components/dist/style.css'
import App from './App.vue'

const app = createApp(App)
app.use(AxisUI)
app.mount('#app')
```

### 按需引入

```typescript
import { AxIcon } from '@axis-ui/components'
import '@axis-ui/components/dist/style.css'

export default {
  components: {
    AxIcon,
  },
}
```

### 在模板中使用

```vue
<template>
  <ax-icon name="edit" size="20" color="#409eff" />
</template>
```

## 📚 组件列表

当前已实现的组件：

- **Icon** - 图标组件

更多组件正在开发中...

## 🔗 相关链接

- [GitHub 仓库](https://github.com/Calvinvv/Axis-UI)
- [更新日志](./CHANGELOG.md)
- [问题反馈](https://github.com/Calvinvv/Axis-UI/issues)

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的改动 (`git commit -m 'feat: add some amazing feature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

## 📄 开源协议

[MIT](./LICENSE) © 韦贺文

## 💖 致谢

感谢所有为这个项目做出贡献的开发者！
