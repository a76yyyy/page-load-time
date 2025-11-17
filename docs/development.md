# 开发指南

## 环境设置

### 项目结构

```
page-load-time/
├── src/                        # WXT 源代码目录
│   ├── entrypoints/            # 入口点
│   │   ├── background.ts       # Background script
│   │   ├── content.ts          # Content script
│   │   └── popup/              # Popup 页面
│   │       ├── index.html
│   │       ├── main.ts
│   │       ├── style.css
│   │       ├── NavigationRenderer.ts
│   │       ├── ResourcesRenderer.ts
│   │       └── VirtualScroller.ts
│   ├── services/               # 后台服务
│   │   └── storage.service.ts  # 存储服务
│   ├── utils/                  # 工具函数
│   │   ├── types.ts            # 类型定义
│   │   ├── messaging.ts        # 消息协议定义
│   │   ├── guards.ts           # 类型守卫
│   │   ├── formatters.ts       # 格式化工具
│   │   └── calculators.ts      # 计算工具
│   ├── locales/                # 国际化文件
│   │   ├── en.yml
│   │   └── zh-CN.yml
│   └── assets/                 # 图标资源
│       ├── icon.svg
│       └── icon.png
├── backup/                     # 旧的 JavaScript 版本备份
├── docs/                       # 文档
├── wxt.config.ts               # WXT 配置
├── tsconfig.json               # TypeScript 配置
├── Makefile                    # 开发命令
└── package.json
```

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

**Chrome（默认）**:

```bash
pnpm dev
# 或
make dev
```

**Firefox**:

```bash
pnpm dev:firefox
# 或
make dev-firefox
```

**Edge**:

```bash
pnpm dev:edge
# 或
make dev-edge
```

WXT 会自动：

- 启动开发服务器
- 打开浏览器并加载扩展
- 启用 HMR（UI 修改即时生效）
- 自动重载 content/background 脚本

### 生产构建

**Chrome（默认）**:

```bash
pnpm build
# 或
make build
```

**Firefox**:

```bash
pnpm build:firefox
# 或
make build-firefox
```

### 打包发布

**Chrome（默认）**:

```bash
pnpm zip
# 或
make zip
```

**Firefox**:

```bash
pnpm zip:firefox
# 或
make zip-firefox
```

### 提取构建产物

WXT 会在 `.output` 目录中生成 ZIP 包。如果需要提取构建产物：

```bash
# 提取所有版本（从 .output 目录）
make extract

# 或分别提取
make extract_chrome    # 提取 Chrome 版本到 build/chrome
make extract_firefox   # 提取 Firefox 版本到 build/firefox
```

提取后的文件会保存在 `build/` 目录中。

## 加载扩展

### Chrome/Edge (开发模式)

1. 打开 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `.output/chrome-mv3-dev` 目录

### Firefox (开发模式)

1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击"临时载入附加组件"
3. 选择 `.output/firefox-mv2-dev/manifest.json`

## 调试

### Background Script

**Chrome/Edge:**

1. 在 `chrome://extensions/` 找到扩展
2. 点击"Service Worker"链接
3. 打开 DevTools 控制台

**Firefox:**

1. 在 `about:debugging` 找到扩展
2. 点击"检查"按钮

**常用调试命令:**

```javascript
// 查看当前监听的标签页
console.log('Active listeners:', tabListeners.size);

// 查看 IndexedDB 统计信息
const stats = await storage.getStats?.();
console.log('Database stats:', stats);

// 查看特定 tab 的所有 IP 数据
const ipData = await storage.getIPDataByTab(tabId);
console.log('IP data:', ipData);

// 查看性能数据
const perfData = await storage.getPerformanceData(tabId);
console.log('Performance data:', perfData);

// 清理过期数据
const deleted = await storage.cleanupOldData();
console.log('Deleted records:', deleted);

// 删除特定 tab 的所有数据
await storage.deleteTabData(tabId);

// 清空所有数据库
indexedDB.deleteDatabase('PageLoadTimeDB');
```

### Content Script

1. 在任意网页按 F12 打开 DevTools
2. 切换到"控制台"标签
3. 刷新页面查看日志

### Popup

1. 右键点击扩展图标
2. 选择"检查弹出内容"
3. 打开 Popup 的 DevTools

## 日志说明

### 日志级别

项目使用标准的日志级别:

| 级别 | 用途 | 示例 |
|------|------|------|
| `console.debug` | 详细的调试信息 | 数据收集、内部状态 |
| `console.info` | 重要的业务流程事件 | 初始化完成、开始/停止监听 |
| `console.warn` | 警告信息,不影响功能 | 获取缓存失败、未就绪 |
| `console.error` | 错误信息,功能异常 | 初始化失败、保存失败 |

### 日志格式

所有日志使用统一格式: `[模块名] 图标 描述`

**模块名**:

- `[Background]` - Background Script
- `[Performance]` - Content Script
- `[Popup]` - Popup UI

**常用图标**:

| 图标 | 含义 | 级别 |
|------|------|------|
| 🔧 | 初始化/检查 | debug |
| 📍 | 内部状态 | debug |
| 📥/📤 | 数据收集/返回 | debug |
| 💾 | 数据保存 | debug |
| 🚀 | 开始监听 | info |
| 🛑 | 停止监听 | info |
| 🧭 | 导航开始 | info |
| 📡 | 收集 IP | debug |
| 🗑️ | 清理数据 | info/debug |
| 🔄 | 升级/更新 | info |
| 📦 | 创建对象 | info |
| 🧹 | 清理过期数据 | info |
| ✅ | 操作成功 | debug/info |
| ⚠️ | 警告 | warn |
| ❌ | 错误 | error |

### 正常流程日志

```
[Background] 🧭 导航开始: Tab 123 → https://example.com
[Background] 🚀 开始监听 Tab 123
[Background] ✅ 监听器已注册,当前监听 1 个标签页
[Background] 📡 收集 IP: 1.2.3.4 for https://example.com/
[Background] 📡 收集 IP: 5.6.7.8 for https://cdn.example.com/style.css
[Background] 📤 返回 Tab 123 的所有 IP 数据: 2 条记录
[Performance] 📥 收到 IP 缓存: 2 条记录
[Background] 📊 收到性能数据: Tab 123, duration: 1234ms
[Background] 💾 性能数据已保存到 IndexedDB: Tab 123
[Background] 🛑 停止监听 Tab 123
[Background] ✅ 监听器已移除,剩余 0 个标签页
```

## 常见问题

### 1. 没有收集到 IP 地址

**检查清单:**

- [ ] 确认 manifest 中有 `webRequest` 权限
- [ ] 确认 manifest 中有 `<all_urls>` host_permissions
- [ ] 查看 background 控制台是否有错误
- [ ] 确认监听器已注册

**排查:**

```javascript
// 检查监听器
console.log('Listeners:', tabListeners.size);

// 检查 IndexedDB 统计
const stats = await storage.getStats?.();
console.log('Database stats:', stats);
```

### 2. 监听器没有启动

**可能原因:**

- `webNavigation.onBeforeNavigate` 没有触发
- frameId 不是 0 (iframe)
- URL 是特殊页面 (chrome://, about:)

**排查:**

```javascript
// 查看所有导航事件
browser.webNavigation.onBeforeNavigate.addListener((details) => {
  console.log('Navigation:', details);
});
```

### 3. 数据没有保存

**检查:**

```javascript
// 查看 IndexedDB 统计
const stats = await storage.getStats?.();
console.log('Database stats:', stats);

// 查看特定 tab 的数据
const ipData = await storage.getIPDataByTab(tabId);
console.log('IP data:', ipData);

const perfData = await storage.getPerformanceData(tabId);
console.log('Performance data:', perfData);
```

### 4. Popup 显示慢

**可能原因:**

- 资源列表过长 (100+ 资源)
- DOM 操作未优化

**解决方案:**

- 已使用 `DocumentFragment` 批量插入
- 已实现 DOM 复用优化
- 已支持虚拟滚动 (100+ 资源时)

### 5. IndexedDB 相关问题

#### 5.1 检查 IndexedDB 数据

在 DevTools 中查看数据库：

- **Chrome/Edge**: Application → IndexedDB → PageLoadTimeDB
- **Firefox**: Storage → IndexedDB → PageLoadTimeDB

应该看到：

- `ipCache` 对象存储：包含 URL、IP、tabId、timestamp
- `performanceData` 对象存储：包含 tabId、timing、timestamp

#### 5.2 清理和重置数据库

```javascript
// 在任意控制台运行
indexedDB.deleteDatabase('PageLoadTimeDB');
// 然后重新加载扩展
```

## 测试

### 手动测试场景

1. **新标签页打开**
   - Ctrl+Click 链接
   - 验证主文档 IP 被捕获

2. **页面刷新**
   - 按 F5 刷新
   - 验证旧数据被清理
   - 验证新数据被收集

3. **快速刷新**
   - 连续按 F5 多次
   - 验证不会创建重复监听器
   - 验证数据正确更新

4. **多标签页**
   - 打开多个标签页
   - 验证数据不会相互干扰
   - 关闭标签页验证清理

5. **特殊页面**
   - chrome://extensions/
   - about:blank
   - 验证不会报错

### 性能测试

```javascript
// 测量监听器创建时间
console.time('startListening');
startListeningForTab(tabId);
console.timeEnd('startListening');

// 测量 storage 写入时间
console.time('saveToStorage');
await storage.saveIPData(url, ip, tabId);
console.timeEnd('saveToStorage');

// 测量 popup 渲染时间
console.time('renderPopup');
app.render();
console.timeEnd('renderPopup');
```

## 代码规范

### TypeScript

- 使用 ES6+ 语法
- 使用 `const`/`let`,避免 `var`
- 使用 async/await,避免回调地狱
- 添加详细的日志和注释
- 充分利用类型系统

### 日志规范

- 使用统一的日志格式: `[模块名] 图标 描述`
- 根据重要性选择合适的日志级别:
  - `console.debug`: 详细的调试信息
  - `console.info`: 重要的业务流程事件
  - `console.warn`: 警告信息
  - `console.error`: 错误信息
- 所有日志使用中文描述
- 使用表情图标增强可读性

### 命名规范

- 函数: `camelCase` (例: `startListeningForTab`)
- 常量: `UPPER_SNAKE_CASE` (例: `MAX_CACHE_SIZE`)
- 变量: `camelCase` (例: `tabListeners`)
- 类: `PascalCase` (例: `ResourcesRenderer`)

### 错误处理

```typescript
// ✅ 好的做法
try {
  await storage.savePerformanceData(tabId, timing);
  console.info('[Background] ✅ 保存成功');
} catch (error) {
  console.error('[Background] ❌ 保存失败:', error);
}

// ❌ 避免
storage.savePerformanceData(tabId, timing); // 没有错误处理
```

## 发布流程

### 1. 版本更新

更新 `wxt.config.ts` 中的版本号:

```typescript
export default defineConfig({
  manifest: {
    version: "1.2.0"
  }
});
```

### 2. 构建

```bash
pnpm build
```

### 3. 打包

```bash
pnpm zip
```

### 4. 提交

- **Chrome Web Store**: 上传 zip 包
- **Firefox Add-ons**: 上传 zip 包

## 最佳实践

### 1. 性能

- ✅ IndexedDB 索引查询
- ✅ 批量操作 DOM
- ✅ 按需创建监听器
- ✅ 及时清理资源
- ✅ DOM 复用优化

### 2. 兼容性

- ✅ 使用 `browser-polyfill.js`
- ✅ 避免浏览器特定 API
- ✅ 测试多个浏览器

### 3. 安全

- ✅ 最小权限原则
- ✅ 数据隔离
- ✅ 自动清理
- ✅ 无外部通信

### 4. 用户体验

- ✅ 快速响应
- ✅ 清晰的 UI
- ✅ 详细的错误提示
- ✅ 优雅的降级

## WXT 配置

### 基础配置

```typescript
// wxt.config.ts
import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",  // ✨ 指定源代码目录

  modules: ["@wxt-dev/i18n/module", "@wxt-dev/auto-icons"],

  autoIcons: {
    baseIconPath: "assets/icon.svg",      // 使用 SVG 作为基础图标
    developmentIndicator: "overlay",      // 开发模式显示黄色 "DEV" 标签
    sizes: [16, 32, 48, 128],            // 生成的图标尺寸
  },

  manifest: {
    name: "__MSG_appName__",
    description: "__MSG_appDescription__",
    version: "4.1.0",
    default_locale: "en",

    permissions: [
      "webRequest",
      "webNavigation",
      "storage",
      "tabs",
      "activeTab",
    ],

    host_permissions: ["<all_urls>"],

    action: {
      default_popup: "popup.html",
    },
  },

  webExt: {
    chromiumArgs: ["--auto-open-devtools-for-tabs"],
  },
});
```

### 关键配置说明

| 配置项 | 说明 |
|--------|------|
| `srcDir` | 源代码目录，WXT 会从此目录读取所有源代码 |
| `modules` | 启用的 WXT 模块（i18n 和 auto-icons） |
| `autoIcons` | 自动生成多尺寸图标配置 |
| `manifest` | 扩展 manifest 配置 |
| `webExt` | 浏览器启动参数 |

## 国际化配置

### 文件结构

国际化文件位于 `src/locales/` 目录：

```
src/locales/
├── en.yml          # 英文翻译
└── zh-CN.yml       # 中文翻译
```

### 英文翻译示例

```yaml
# src/locales/en.yml
appName: Page Load Time
appDescription: A powerful browser extension for measuring and analyzing web page load performance

navigation:
  title: Navigation Timing
  loadTimings: Load timings (ms)
  event: Event
  start: Start
  duration: Duration
  end: End
  redirect: Redirect
  dns: DNS
  connect: Connect
  request: Request
  response: Response
  dom: DOM
  parse: Parse
  executeScripts: Execute Scripts
  contentLoaded: Content loaded
  subResources: Sub Resources
  loadEvent: Load event
  total: Total
  remoteIP: Remote IP
  timingsBasedOn: Timings are based on

resources:
  title: Resources
  resourceTimings: Resource Timings
  resource: Resource
  name: Name
  type: Type
  duration: Duration
  size: Size
  noData: No resources data
  url: URL
  startTime: Start Time
  transferSize: Transfer Size
  encodedSize: Encoded Size
  decodedSize: Decoded Size
  protocol: Protocol
  status: Status
  remoteIP: Remote IP

actions:
  export: Export Data
  refresh: Refresh

common:
  noData: No timing data available for this page
  cached: cached
```

### 中文翻译示例

```yaml
# src/locales/zh-CN.yml
appName: 页面加载时间
appDescription: 强大的浏览器扩展,用于测量和分析网页加载性能

navigation:
  title: 导航时序
  loadTimings: 加载时序 (ms)
  event: 事件
  start: 开始
  duration: 耗时
  end: 结束
  redirect: 重定向
  dns: DNS
  connect: 连接
  request: 请求
  response: 响应
  dom: DOM
  parse: 解析
  executeScripts: 执行脚本
  contentLoaded: 内容加载
  subResources: 子资源
  loadEvent: 加载事件
  total: 总计
  remoteIP: 远程 IP
  timingsBasedOn: 时序基于

resources:
  title: 资源列表
  resourceTimings: 资源时序
  resource: 资源
  name: 名称
  type: 类型
  duration: 耗时
  size: 大小
  noData: 无资源数据
  url: URL
  startTime: 开始时间
  transferSize: 传输大小
  encodedSize: 编码大小
  decodedSize: 解码大小
  protocol: 协议
  status: 状态
  remoteIP: 远程 IP

actions:
  export: 导出数据
  refresh: 刷新

common:
  noData: 此页面暂无性能数据
  cached: 已缓存
```

### 在代码中使用

```typescript
import { i18n } from "#i18n";

// 获取翻译
const title = i18n.t("navigation.title");
const duration = i18n.t("resources.duration");

// 在 HTML 中使用
const html = `<h3>${i18n.t("navigation.loadTimings")}</h3>`;
```

## 资源

### 文档

- [WXT 官方文档](https://wxt.dev/)
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/)
- [MDN WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Navigation Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_timing_API)
- [Resource Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Resource_Timing_API)

### 工具

- [browser-polyfill](https://github.com/mozilla/webextension-polyfill)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Firefox Developer Tools](https://firefox-source-docs.mozilla.org/devtools-user/)
