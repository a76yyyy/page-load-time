# Page Load Time

[English](README.md) | 中文

一个功能强大的浏览器扩展，用于测量和分析网页加载性能。支持 Chrome、Firefox、Edge 等现代浏览器。

## 🚀 功能特性

- 📊 **导航计时分析**: 使用 Performance Navigation Timing API 获取详细的页面加载时间分解
- 🔍 **资源分析**: 查看所有子资源的详细性能指标
- 🌐 **IP 地址追踪**: 显示每个资源的服务器 IP 地址
- 📈 **可视化性能指标**: 交互式图表和表格
- 💾 **导出数据**: 将性能数据导出为 JSON
- 🌍 **多语言支持**: 英文 & 中文
- ⚡ **性能优化**: DOM 复用优化（快 10-13 倍）
- 🔄 **自动清理**: 自动清理过期数据

## 📦 安装

### 从应用商店安装

- **Firefox**: [Mozilla Add-ons](https://addons.mozilla.org/en-CA/firefox/addon/load-timer/)
- **Chrome/Brave**: [Chrome Web Store](https://chrome.google.com/webstore/detail/page-load-time/fploionmjgeclbkemipmkogoaohcdbig/)
- **Edge**: [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/page-load-time/llcdjocbfkdndmjbgpaibfkdjkjogeho)

### 本地开发安装

#### Chrome/Edge

1. 打开 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `.output/chrome-mv3-dev` 目录

#### Firefox

1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击"临时载入附加组件"
3. 选择 `.output/firefox-mv2-dev/manifest.json`

## 🛠️ 开发

### 前置要求

- Node.js 18+
- pnpm（推荐）

### 快速开始

```bash
# 安装依赖
pnpm install

# 开发模式（Chrome）
pnpm dev

# 开发模式（Firefox）
pnpm dev:firefox

# 开发模式（Edge）
pnpm dev:edge

# 生产构建
pnpm build

# 创建发布 ZIP
pnpm zip

# 类型检查
pnpm compile
```

### 使用 Makefile

```bash
# 查看所有可用命令
make help

# 开发
make dev              # Chrome 开发模式
make dev-firefox      # Firefox 开发模式
make dev-edge         # Edge 开发模式

# 构建
make build            # Chrome 生产构建
make build-firefox    # Firefox 生产构建

# 打包
make zip              # Chrome ZIP 包
make zip-firefox      # Firefox ZIP 包

# 提取
make extract          # 提取所有版本
make extract_chrome   # 提取 Chrome 版本
make extract_firefox  # 提取 Firefox 版本

# 清理
make clean            # 清理构建产物
make clean-all        # 完整清理（包括 node_modules）
make reinstall        # 重新安装依赖
```

### 项目结构

```
page-load-time/
├── src/
│   ├── entrypoints/
│   │   ├── background.ts       # Background 服务工作线程
│   │   ├── content.ts          # Content 脚本
│   │   └── popup/              # Popup UI
│   │       ├── main.ts
│   │       ├── NavigationRenderer.ts
│   │       ├── ResourcesRenderer.ts
│   │       └── VirtualScroller.ts
│   ├── services/
│   │   └── storage.service.ts  # IndexedDB 存储
│   ├── utils/
│   │   ├── types.ts
│   │   ├── messaging.ts
│   │   ├── guards.ts
│   │   ├── formatters.ts
│   │   └── calculators.ts
│   ├── locales/                # 国际化翻译
│   └── assets/                 # 图标和资源
├── docs/                       # 文档
├── Makefile                    # 开发命令
└── package.json
```

## 🏗️ 技术栈

- **框架**: [WXT](https://wxt.dev/) - 下一代 Web 扩展框架
- **语言**: TypeScript
- **存储**: IndexedDB via [idb](https://github.com/jakearchibald/idb)
- **消息系统**: [@webext-core/messaging](https://webext-core.aklinker1.io/)
- **国际化**: [@wxt-dev/i18n](https://wxt.dev/i18n.html)
- **UI**: Vanilla TypeScript（无框架开销）

## 🌐 浏览器支持

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Firefox 109+

## 📋 工作原理

### 架构

1. **Background Script** (`background.ts`)
   - 通过 `webNavigation.onBeforeNavigate` 监听导航事件
   - 通过 `webRequest.onCompleted` 收集 IP 地址
   - 管理标签页生命周期和监听器
   - 使用自动清理功能将数据存储在 IndexedDB 中

2. **Content Script** (`content.ts`)
   - 使用 Performance API 捕获性能时序
   - 收集资源加载时间数据
   - 通过类型安全的消息系统与 background script 通信
   - 将 IP 地址关联到资源

3. **存储服务** (`storage.service.ts`)
   - 基于 IndexedDB 的存储，支持自动清理
   - 类型安全的代理服务接口
   - 高效的索引查询

4. **Popup UI** (`popup/`)
   - 导航时序可视化
   - 支持排序和筛选的资源列表
   - DOM 复用优化以提高性能
   - 大型资源列表的虚拟滚动

### 数据流

```
用户导航
    ↓
webNavigation.onBeforeNavigate
    └─ 启动 webRequest 监听器
    ↓
webRequest.onCompleted（并发）
    └─ 保存 IP 到 IndexedDB
    ↓
Content script 收集性能数据
    ↓
getIPData 请求
    └─ 从 IndexedDB 检索
    ↓
savePerformanceData
    └─ 存储到 IndexedDB
    ↓
Popup 显示指标
```

## 📚 文档

- **[架构设计](docs/architecture.md)** - 系统设计、组件和优化策略
- **[开发指南](docs/development.md)** - 设置、调试、测试和最佳实践
- **[文档索引](docs/README.md)** - 所有文档概览

## 🔒 隐私和安全

- ✅ **本地处理**: 所有数据在本地处理，从不上传
- ✅ **数据隔离**: 每个标签页的数据独立存储
- ✅ **自动清理**: 标签页关闭时自动清理，定期清理过期数据
- ✅ **最小权限**: 仅请求必要的权限
- ✅ **无外部通信**: 无外部 API 调用

## 📄 许可证

MIT 许可证 - 详见 [LICENSE.md](LICENSE.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 🙏 致谢

- 使用 [WXT](https://wxt.dev/) 构建
- 使用 [webext-core](https://webext-core.aklinker1.io/) 工具
- 受浏览器 DevTools Performance 面板启发
