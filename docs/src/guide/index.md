# 介绍

Axis-UI 是一个基于 Vue 3 + TypeScript 的现代化组件库，采用 Monorepo 架构，提供完整的 TDD 开发体验。

## ✨ 特性

- 🚀 **现代化技术栈**: Vue 3 + TypeScript + Vite
- 🧪 **TDD 开发**: 完整的测试驱动开发环境
- 📚 **完善文档**: 基于 VitePress 的文档站点
- 🎨 **主题定制**: 支持 CSS 变量和主题定制
- 📦 **Monorepo**: 采用 pnpm workspace 架构
- 🔧 **开发工具**: 集成 ESLint、Prettier、Husky

## 🏗️ 架构设计

```
Axis-UI/
├── packages/
│   ├── components/     # 组件库核心
│   ├── theme-chalk/    # 主题样式
│   └── utils/          # 工具函数
├── docs/               # 文档站点
├── play/               # 开发预览
└── test/               # 测试文件
```

## 🎯 设计理念

- **组件优先**: 每个组件都是独立的、可复用的
- **测试驱动**: 先写测试，再写实现，保证代码质量
- **文档即代码**: 文档与代码同步更新，提供实时预览
- **类型安全**: 完整的 TypeScript 支持
- **性能优化**: Tree Shaking 和按需引入

## 🚀 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 运行测试
pnpm test

# 启动文档站点
pnpm docs:dev
```

## 📖 文档导航

- [快速开始](./getting-started) - 了解如何快速上手
- [TDD 开发流程](./tdd-workflow) - 测试驱动开发指南
- [组件开发规范](./component-guidelines) - 组件开发最佳实践
