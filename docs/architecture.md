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

  startListeningForTab(details.tabId);
});
```

**优势**:

- ✅ 在所有网络请求之前触发
- ✅ 覆盖所有场景(刷新、前进/后退、新标签页)
- ✅ 100% 捕获主文档 IP

### 2. 数据存储: IndexedDB

**问题**: 需要高效、可靠的数据存储方案

**方案**: 使用 IndexedDB 存储 IP 缓存和性能数据

```javascript
// IndexedDB 存储管理器
const storageManager = new PageLoadStorageManager();
await storageManager.init();

// 保存 IP 数据
await storageManager.saveIPData(url, ip, tabId);

// 保存性能数据
await storageManager.savePerformanceData(tabId, timing);
```

**优势**:

- ✅ 大容量 (50+ MB)
- ✅ O(1) 索引查询
- ✅ 自动清理过期数据
- ✅ 跨上下文共享数据

### 3. 生命周期管理

```
用户导航
    ↓
webNavigation.onBeforeNavigate
    └─ 启动 webRequest 监听器
    ↓
webRequest.onCompleted (并发)
    └─ 保存到 IndexedDB
    ↓
performance.js 调用 getIPData
    └─ 从 IndexedDB 读取数据
    ↓
performance.js 调用 stopListening
    └─ 移除监听器
    ↓
tabs.onRemoved
    └─ 清理 IndexedDB 数据
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
保存到 IndexedDB: storageManager.saveIPData(url, ip, tabId)
    ↓
getIPData 请求
    ↓
从 IndexedDB 读取: storageManager.getIPDataByTab(tabId)
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
保存到 IndexedDB: storageManager.savePerformanceData(tabId, timing)
    ↓
更新 badge 和 popup
```

## 性能优化

### 1. Popup 渲染优化

- 使用 `DocumentFragment` 批量插入 DOM
- 事件委托减少监听器数量
- 延迟渲染非关键内容

### 2. Storage 优化

- IndexedDB 索引查询
- 自动清理过期数据
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

## 存储架构

### IndexedDB 实现

使用 **IndexedDB** 作为主要存储方案：

| 特性 | 实现 |
|------|------|
| **容量** | 50+ MB |
| **查询** | O(1) 索引查询 |
| **清理** | 自动清理过期数据 |
| **稳定性** | 自动管理，避免溢出 |

### 数据库架构

```javascript
// IndexedDB: PageLoadTimeDB (v1)
{
  ipCache: {
    keyPath: 'url',
    indexes: ['timestamp', 'tabId']
    // 数据: { url, ip, tabId, timestamp }
  },

  performanceData: {
    keyPath: 'tabId',
    indexes: ['timestamp']
    // 数据: { tabId, timing, timestamp }
  }
}
```

### 跨上下文实现

**关键设计**: 在不同上下文中按需创建实例

```javascript
// storage-manager.js - 只定义类
class PageLoadStorageManager {
  async init() {
    // 自动检测上下文
    const idb = typeof self !== 'undefined' && self.indexedDB ? self.indexedDB :
                typeof window !== 'undefined' && window.indexedDB ? window.indexedDB :
                indexedDB;
    // ...
  }
}

// background.js - Service Worker 上下文
const storageManager = new PageLoadStorageManager();
await storageManager.init();

// popup.js - 页面上下文
const storageManager = new PageLoadStorageManager();
const storageManagerReady = storageManager.init();
```

**设计原因**:

1. Service Worker 使用 `self.indexedDB`
2. 页面使用 `window.indexedDB`
3. 每个上下文独立管理实例生命周期
4. 数据在不同上下文间共享（同一数据库）

### 事务管理

**错误示例**: 创建多个独立事务

```javascript
// ❌ 错误：第一个事务可能在第二个开始前完成
const tx1 = db.transaction(['store1'], 'readonly');
const data1 = await new Promise(...);
const tx2 = db.transaction(['store2'], 'readonly');
const data2 = await new Promise(...);
```

**正确示例**: 使用单个事务 + Promise.all

```javascript
// ✅ 正确：单个事务访问多个对象存储
const tx = db.transaction(['store1', 'store2'], 'readonly');
const store1 = tx.objectStore('store1');
const store2 = tx.objectStore('store2');

const [data1, data2] = await Promise.all([
  new Promise((resolve, reject) => {
    const req = store1.get(key1);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }),
  new Promise((resolve, reject) => {
    const req = store2.get(key2);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  })
]);
```

### 自动清理机制

```javascript
// background.js 中的定期清理
setInterval(() => {
  storageManager.cleanupOldData();
}, 30 * 60 * 1000); // 每 30 分钟执行一次

// storage-manager.js 中的实现
async cleanupOldData(expiryTime = 3600000) {
  // 自动删除 1 小时前的过期数据
  // 防止数据无限增长
}
```

### Firefox 特殊配置

Firefox 需要在 manifest 中显式声明所有 background 脚本：

```json
// manifest.firefox.json
{
  "background": {
    "scripts": [
      "browser-polyfill.min.js",
      "storage-manager.js",    // 必须显式添加
      "background.js"
    ]
  }
}
```

Chrome 使用 Service Worker，可以通过 `importScripts()` 动态加载：

```json
// manifest.chrome.json
{
  "background": {
    "service_worker": "background.js"
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

## 错误处理

### 常见存储错误

#### 1. 事务已完成错误

```
Failed to execute 'count' on 'IDBObjectStore': The transaction has finished.
```

**原因**: IndexedDB 事务在所有请求完成后自动提交，使用 `await` 会导致事务在等待期间完成

**解决方案**: 使用单个事务 + `Promise.all()`（见上文"事务管理最佳实践"）

#### 2. 上下文错误

```
ReferenceError: window is not defined
```

**原因**: Service Worker 中没有 `window` 对象

**解决方案**: 自动检测上下文（见上文"跨上下文实现"）

#### 3. 数据类型错误

**原因**: 尝试序列化不可序列化的对象（函数、正则表达式等）

**解决方案**: 在保存前自动清理数据

```javascript
// storage-manager.js 中的数据清理
cleanDataForStorage(obj) {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'function' || typeof obj === 'symbol') return undefined;
  if (obj instanceof Date) return obj.toISOString();
  if (obj instanceof RegExp) return obj.source;
  if (Array.isArray(obj)) return obj.map(item => this.cleanDataForStorage(item));

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    const cleanedValue = this.cleanDataForStorage(value);
    if (cleanedValue !== undefined) cleaned[key] = cleanedValue;
  }
  return cleaned;
}
```

## 安全考虑

1. **权限最小化**: 只请求必要的权限
2. **数据隔离**: 每个 tab 的数据独立存储
3. **自动清理**: Tab 关闭时清理所有相关数据，定期清理过期数据
4. **无外部通信**: 所有数据本地处理,不上传到服务器
5. **隐私保护**: 隐私浏览模式下数据仅在内存中存储
