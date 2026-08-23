# axis-ui

## 0.1.0

### Minor Changes

- 9bf91e4: 发布工程修复：组件产物改为 ESM + UMD（移除损坏的 require 入口），补齐 sideEffects/repository/engines 等元数据；ESM 产物不再误打包 async-validator；内置 SVG 图标替换编译期图标依赖，修复产物中 loading/清空/展开图标无法解析的问题（同时修复 clearable 图标因依赖 suffixIcon 插槽而永不渲染的 bug）；utils 改为 ESM-only 并修复类型产物污染；theme-chalk 提供 dist/index.css 主入口与 exports 字段，SCSS partial 加下划线前缀避免空产物；发布流程改为 pnpm publish（正确重写 workspace 协议）并新增 npm-pack 安装级冒烟与 publint/attw 审计

### Patch Changes

- 9bd6cda: 修复库构建缺少 Vue JSX 转换导致 TSX 组件（VirtualList）产物损坏的问题；移除 virtual-list 样式中的调试边框；修正覆盖率阈值配置未生效的问题并补充 VirtualList 行为测试
- Updated dependencies [9bf91e4]
- Updated dependencies [9bd6cda]
  - @axis-ui/utils@1.0.3
  - @axis-ui/theme-chalk@1.0.2

## 0.0.2

### Patch Changes

- feat: 完成构建流程优化与版本管理配置
