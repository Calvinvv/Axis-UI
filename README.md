# Axis-UI

<p align="center">
  <strong>一个现代化、轻量级的 Vue 3 组件库</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/axis-ui"><img src="https://img.shields.io/npm/v/axis-ui.svg" alt="npm version"></a>
  <a href="https://github.com/CalWade/Axis-UI/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/axis-ui.svg" alt="license"></a>
  <a href="https://github.com/CalWade/Axis-UI"><img src="https://img.shields.io/github/stars/CalWade/Axis-UI?style=social" alt="GitHub stars"></a>
</p>

<p align="center">
  📖 <a href="https://calwade.github.io/Axis-UI/">在线文档</a>
</p>

## ✨ 特性

- 🚀 **现代化架构**: 基于 Vue 3 + TypeScript + Vite 构建
- 📦 **双模式构建**: 同时支持 ESM (Tree-shaking) 和 UMD 格式
- 🎨 **类型友好**: 提供完整的 TypeScript 类型定义
- 🔧 **按需引入**: 支持 Resolver 自动按需加载
- 🏗️ **工程化规范**: 采用 Monorepo 架构，使用 Changesets 管理版本
- 🧪 **质量保障**: 完善的测试流程（单元测试 + 冒烟测试）

## Axis ACP DevKit（私有工作区）

仓库同时包含一套面向 Coding Agent 开发者的 ACP v1 测试与调试工具链。它不会随 `axis-ui` 发布，核心能力可在无浏览器环境运行：安全启动已注册的 stdio Agent、记录 Raw JSON-RPC 与归一化事件、执行三个固定场景、生成诊断与单次 JSON/HTML 报告，并从脱敏 Transcript 离线恢复状态。

```bash
# 构建全部工作区
pnpm build:all

# 确定性场景 + JSON/HTML 证据
node packages/acp-cli/dist/main.js run \
  --target fixture-agent \
  --scenario cancel-during-permission \
  --workspace . \
  --output artifacts/runs

# 离线回放并校验 State Hash
node packages/acp-cli/dist/main.js replay \
  --input artifacts/runs/fixture-agent-cancel-during-permission.axis-acp.json

# 检查本机已安装的真实 OpenCode ACP Agent
node packages/acp-cli/dist/main.js inspect --target opencode --workspace .
```

启动可视化 Workbench 时，Node Host 与浏览器分开运行。`serve` 只绑定 loopback，使用高熵临时 Token 和 Origin 校验；浏览器只能发送已注册的 Target ID、固定 Scenario ID 与 Workspace，不能提交可执行命令或参数。

```bash
# 终端 1：复制输出的 ws URL 与 Token
node packages/acp-cli/dist/main.js serve --origin http://127.0.0.1:5173

# 终端 2
pnpm --filter @axis-ui/acp-devtools dev

# 打开：
# http://127.0.0.1:5173/?bridge=<encoded-ws-url>&token=<token>&workspace=<encoded-absolute-path>
```

范围边界：当前只支持 ACP v1、stdio、三个固定 Scenario 和单次报告；结果是 Axis 场景集内的工程证据，不是 ACP 官方认证，也不评价模型代码质量。

录制的本地闭环演示：[`docs/public/demos/axis-acp-devtools.webm`](./docs/public/demos/axis-acp-devtools.webm)。视频展示鉴权 Bridge 场景运行、Run Evidence 切换和 Diagnostic→Sequence 跳转，不包含 Token 或地址栏。

## 📦 安装

```bash
# 使用 pnpm
pnpm add axis-ui

# 使用 npm
npm install axis-ui

# 使用 yarn
yarn add axis-ui
```

## 🔨 使用

### 全量引入

```typescript
import { createApp } from 'vue'
import AxisUI from 'axis-ui'
import 'axis-ui/dist/style.css'
import App from './App.vue'

const app = createApp(App)
app.use(AxisUI)
app.mount('#app')
```

### 按需引入 (推荐)

借助 `unplugin-vue-components` 和 `AxisUIResolver`，您可以实现自动按需引入。

**vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import Components from 'unplugin-vue-components/vite'
import { AxisUIResolver } from 'axis-ui/resolver'

export default defineConfig({
  plugins: [
    Components({
      resolvers: [AxisUIResolver()],
    }),
  ],
})
```

### 手动按需引入

```typescript
import { AxIcon } from 'axis-ui'
// 样式文件会自动按需加载（如果使用了 Resolver），否则需手动引入
// import 'axis-ui/dist/style.css'
```

## 📚 组件列表

当前已实现的组件：

- **Button** - 按钮组件
- **Checkbox** - 复选框组件
- **Form** - 表单组件
- **Icon** - 图标组件
- **Input** - 输入框组件
- **Tree** - 树形控件
- **VirtualList** - 虚拟列表

更多组件正在开发中...

## 🔗 相关链接

- [在线文档](https://calwade.github.io/Axis-UI/)
- [GitHub 仓库](https://github.com/CalWade/Axis-UI)
- [更新日志](https://github.com/CalWade/Axis-UI/releases)
- [问题反馈](https://github.com/CalWade/Axis-UI/issues)

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
