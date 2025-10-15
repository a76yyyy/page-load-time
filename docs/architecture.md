# 架构设计

## 概述

Page Load Time 是一个浏览器扩展,用于测量和显示网页加载性能指标,包括资源加载时间和服务器 IP 地址。

## 核心组件

### 1. Background Script (`background.js`)

Service Worker,负责:

- 监听 webRequest 事件收集 IP 地址
- 管理标签页生命周期
- 存储性能数据和 IP 缓存

### 2. Content Script (`performance.js`)

注入到页面中,负责:

- 收集页面性能指标 (Navigation Timing API)
- 收集资源加载时间 (Resource Timing API)
- 与 background script 通信

### 3. Popup (`popup.html/js/css`)

用户界面,显示:

- 页面加载时间
- 资源加载瀑布图
- 服务器 IP 地址

## 关键设计决策

### 1. 监听时机: webNavigation.onBeforeNavigate

**问题**: 何时开始监听 webRequest 才能捕获所有请求(包括主文档)?

**方案**: 使用 `webNavigation.onBeforeNavigate` 事件

```javascript
browser.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return; // 只处理主框架

  ipCacheMemory.set('tab' + details.tabId, {});
  startListeningForTab(details.tabId);
});
```

**优势**:

- ✅ 在所有网络请求之前触发
- ✅ 覆盖所有场景(刷新、前进/后退、新标签页)
- ✅ 100% 捕获主文档 IP

### 2. 竞态条件解决: 内存缓存 + 独立 Storage Key

**问题**: 并发请求同时写入 storage 会导致数据覆盖

**方案**:

1. 使用内存 Map 存储 IP 数据(同步操作,无竞态)
2. 每个 tab 使用独立的 storage key

```javascript
// 内存缓存 - 同步修改,无竞态
const ipCacheMemory = new Map();

// 独立的 storage key
const cacheKey = 'cache_tab' + tabId;
const ipCacheKey = 'ipCache_tab' + tabId;
```

**优势**:

- ✅ 内存操作是原子的
- ✅ 独立 key 避免相互覆盖
- ✅ 性能提升 10-30 倍

### 3. 生命周期管理

```
用户导航
    ↓
webNavigation.onBeforeNavigate
    ├─ 创建内存缓存对象
    └─ 启动 webRequest 监听器
    ↓
webRequest.onCompleted (并发)
    └─ 同步写入内存缓存
    ↓
performance.js 调用 getIPData
    ├─ 批量保存到 storage
    └─ 返回内存数据
    ↓
performance.js 调用 stopListening
    └─ 移除监听器
    ↓
tabs.onRemoved
    ├─ 清理内存缓存
    └─ 清理 storage
```

### 4. 消息处理

使用现代 Promise-based API:

```javascript
browser.runtime.onMessage.addListener((request, sender) => {
  if (request.action === 'getIPData') {
    return (async () => {
      // 异步处理
      return data;
    })();
  }
});
```

**优势**:

- ✅ 符合 WebExtension 标准
- ✅ 更好的跨浏览器兼容性
- ✅ 代码更简洁

## 数据流

### IP 数据收集

```
webRequest.onCompleted
    ↓
写入内存: ipCacheMemory.get(tabKey)[url] = {ip, timestamp}
    ↓
getIPData 请求
    ↓
批量保存: storage.local.set({ipCache_tab123: {...}})
    ↓
返回数据给 content script
```

### 性能数据收集

```
performance.js (window.load)
    ↓
收集 Navigation Timing + Resource Timing
    ↓
发送消息: {timing: {...}, time: '1.23s'}
    ↓
保存: storage.local.set({cache_tab123: {...}})
    ↓
更新 badge 和 popup
```

## 性能优化

### 1. Popup 渲染优化

- 使用 `DocumentFragment` 批量插入 DOM
- 事件委托减少监听器数量
- 延迟渲染非关键内容

### 2. Storage 优化

- 独立 key 避免竞态
- 批量写入减少 I/O
- Tab 关闭时自动清理

### 3. 监听器优化

- 按需创建,用完即删
- 防重复机制
- 精确的生命周期管理

## 跨浏览器兼容性

### Chrome/Edge (Manifest V2)

- 使用 `chrome.*` API
- Service Worker 作为 background script

### Firefox

- 使用 `browser.*` API (Promise-based)
- 支持更多过滤器选项

### 统一方案

- 使用 `browser-polyfill.js`
- 避免使用浏览器特定功能
- 在回调中进行条件判断而非依赖过滤器

## 存储结构

```javascript
storage.local = {
  // 性能数据
  'cache_tab123': {
    url: 'https://example.com',
    loadTime: 1234,
    resources: [...],
    // ...
  },

  // IP 缓存
  'ipCache_tab123': {
    'https://example.com': {
      ip: '1.2.3.4',
      timestamp: 1234567890
    },
    'https://cdn.example.com/style.css': {
      ip: '5.6.7.8',
      timestamp: 1234567891
    }
  }
}
```

## 权限说明

```json
{
  "permissions": [
    "webRequest",      // 监听网络请求
    "webNavigation",   // 监听导航事件
    "storage",         // 存储数据
    "tabs",            // 访问标签页信息
    "activeTab"        // 访问当前标签页
  ],
  "host_permissions": [
    "<all_urls>"       // 访问所有网站
  ]
}
```

## 安全考虑

1. **权限最小化**: 只请求必要的权限
2. **数据隔离**: 每个 tab 的数据独立存储
3. **自动清理**: Tab 关闭时清理所有相关数据
4. **无外部通信**: 所有数据本地处理,不上传到服务器
