# 开发指南

## 环境设置

### 项目结构

```
page-load-time/
├── src/                    # 源代码
│   ├── background.js       # Background script
│   ├── performance.js      # Content script
│   ├── popup.html/js/css   # Popup UI
│   ├── manifest.json       # Chrome manifest
│   └── manifest.firefox.json  # Firefox manifest
├── docs/                   # 文档
└── screenshots/            # 截图
```

## 加载扩展

### Chrome/Edge

1. 打开 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `src` 目录

### Firefox

1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击"临时载入附加组件"
3. 选择 `src/manifest.firefox.json`

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
await storageManager.getStats();

// 查看特定 tab 的所有 IP 数据
await storageManager.getIPDataByTab(tabId);

// 查看特定 URL 的 IP
await storageManager.getIPData(url);

// 查看性能数据
await storageManager.getPerformanceData(tabId);

// 清理过期数据
await storageManager.cleanupOldData();

// 删除特定 tab 的所有数据
await storageManager.deleteTabData(tabId);

// 清空所有数据库
indexedDB.deleteDatabase('PageLoadTimeDB');
```

### Popup

**快速测试脚本:**

```javascript
// 在 Popup DevTools 控制台中运行
(async function quickTest() {
    console.log('🚀 快速测试开始...\n');

    try {
        console.log('✓ IndexedDB 可用:', !!window.indexedDB);
        console.log('✓ storageManager 存在:', !!storageManager);
        console.log('✓ storageManager.db:', storageManager.db ? '已初始化' : '未初始化');

        if (!storageManager.db) {
            console.log('\n⏳ 等待初始化...');
            try {
                if (typeof storageManagerReady !== 'undefined') {
                    await storageManagerReady;
                } else {
                    await storageManager.init();
                }
                console.log('✓ 初始化完成');
            } catch (e) {
                console.error('✗ 初始化失败:', e.message);
                return;
            }
        }

        console.log('\n📊 测试数据读取...');
        const stats = await storageManager.getStats();
        console.log('✓ 统计信息:', stats);

        const tabs = await browser.tabs.query({active: true, currentWindow: true});
        const tabId = tabs[0].id;
        console.log('✓ 当前 Tab ID:', tabId);

        const perfData = await storageManager.getPerformanceData(tabId);
        console.log('✓ 性能数据:', perfData ? '已找到' : '未找到');

        const ipData = await storageManager.getIPDataByTab(tabId);
        console.log('✓ IP 数据:', Object.keys(ipData).length, '条记录');

        console.log('\n✅ 所有测试通过！');

    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        console.error('详细错误:', error);
    }
})();
```

**完整诊断脚本:**

```javascript
// 在 Popup DevTools 控制台中运行
async function diagnosePopupIndexedDB() {
    console.log('=== 🔍 开始诊断 Popup IndexedDB ===\n');

    // 1. 检查 IndexedDB API
    console.log('1️⃣ 检查 IndexedDB API:');
    if (!window.indexedDB) {
        console.error('  ❌ IndexedDB 不可用！');
        return;
    }
    console.log('  ✅ IndexedDB 可用\n');

    // 2. 检查 storageManager 实例
    console.log('2️⃣ 检查 storageManager 实例:');
    if (!storageManager) {
        console.error('  ❌ storageManager 不存在！');
        return;
    }
    console.log('  ✅ storageManager 存在');
    console.log('  storageManager.db:', storageManager.db);
    console.log('');

    // 3. 检查初始化状态
    console.log('3️⃣ 检查初始化状态:');
    let hasStorageManagerReady = false;
    try {
        hasStorageManagerReady = typeof storageManagerReady !== 'undefined' && storageManagerReady !== null;
    } catch (e) {}

    if (!hasStorageManagerReady) {
        if (storageManager.db) {
            console.log('  ✅ 数据库已经初始化');
        } else {
            console.log('  尝试手动初始化...');
            await storageManager.init();
            console.log('  ✅ 手动初始化成功');
        }
    } else {
        await storageManagerReady;
        console.log('  ✅ 初始化完成');
    }
    console.log('');

    // 4. 验证数据库连接
    console.log('4️⃣ 验证数据库连接:');
    if (!storageManager.db) {
        console.error('  ❌ storageManager.db 仍然是 null！');
        return;
    }
    console.log('  ✅ 数据库连接正常');
    console.log('  数据库名称:', storageManager.db.name);
    console.log('  对象存储:', Array.from(storageManager.db.objectStoreNames));
    console.log('');

    // 5. 测试数据读取
    console.log('5️⃣ 测试数据读取:');
    const stats = await storageManager.getStats();
    console.log('  ✅ 统计信息:', stats);

    const tabs = await browser.tabs.query({active: true, currentWindow: true});
    const tabId = tabs[0].id;
    console.log('  当前 Tab ID:', tabId);

    const perfData = await storageManager.getPerformanceData(tabId);
    console.log('  性能数据:', perfData ? '已找到' : '未找到');

    const ipData = await storageManager.getIPDataByTab(tabId);
    console.log('  IP 数据:', Object.keys(ipData).length, '条记录');

    console.log('\n=== ✅ 诊断完成 ===');
}

diagnosePopupIndexedDB();
```

### Content Script

1. 在任意网页按 F12 打开 DevTools
2. 切换到"控制台"标签
3. 刷新页面查看日志

### Popup

1. 右键点击扩展图标
2. 选择"检查弹出内容"
3. 打开 Popup 的 DevTools
4. 运行上面的快速测试或完整诊断脚本

## 日志说明

### 日志图标

| 图标 | 含义 |
|------|------|
| 🧭 | 导航开始 |
| 🚀 | 开始监听 |
| 📡 | 收集 IP |
| 🛑 | 停止监听 |
| 💾 | 保存数据 |
| 🗑️ | 清理缓存 |
| ✅ | 操作成功 |
| ❌ | 操作失败 |

### 正常流程日志

```
[DEBUG] 🧭 导航开始: Tab 123 → https://example.com
[DEBUG] 🚀 开始监听 Tab 123
[DEBUG] ✅ 监听器已注册,当前监听 1 个标签页
[DEBUG] 📡 收集 IP: 1.2.3.4 for https://example.com/
[DEBUG] 📡 收集 IP: 5.6.7.8 for https://cdn.example.com/style.css
[DEBUG] 💾 IP 数据已保存: https://example.com/ → 1.2.3.4
[DEBUG] 📤 返回 Tab 123 的所有 IP 数据: 2 条记录
[DEBUG] 🛑 停止监听 Tab 123
[DEBUG] ✅ 监听器已移除,剩余 0 个标签页
```

## 常见问题

### 1. 没有收集到 IP 地址

**检查清单:**

- [ ] 确认 manifest 中有 `webRequest` 权限
- [ ] 确认 manifest 中有 `<all_urls>` host_permissions
- [ ] 查看 background 控制台是否有错误
- [ ] 确认监听器已注册 (`tabListeners.size > 0`)

**排查:**

```javascript
// 检查监听器
console.log('Listeners:', tabListeners.size);

// 检查 IndexedDB 统计
await storageManager.getStats();
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
const stats = await storageManager.getStats();
console.log('Database stats:', stats);

// 查看特定 tab 的数据
const ipData = await storageManager.getIPDataByTab(tabId);
console.log('IP data:', ipData);

const perfData = await storageManager.getPerformanceData(tabId);
console.log('Performance data:', perfData);
```

### 4. Popup 显示慢

**可能原因:**

- 资源列表过长 (100+ 资源)
- DOM 操作未优化

**解决方案:**

- 已使用 `DocumentFragment` 批量插入
- 考虑使用事件委托
- 考虑虚拟滚动 (200+ 资源时)

### 5. IndexedDB 相关问题

#### 5.1 检查 IndexedDB 数据

在 DevTools 中查看数据库：

- **Chrome/Edge**: Application → IndexedDB → PageLoadTimeDB
- **Firefox**: Storage → IndexedDB → PageLoadTimeDB

应该看到：

- `ipCache` 对象存储：包含 URL、IP、tabId、timestamp
- `performanceData` 对象存储：包含 tabId、timing、timestamp

#### 5.2 storageManager.db 为 null

**原因**: 初始化未完成（异步操作）

**验证**:

```javascript
// 在 popup 控制台运行
storageManager.db
// 如果返回 null，等待初始化完成
await storageManagerReady;
console.log('Database:', storageManager.db);
// 现在应该返回 IDBDatabase 对象
```

#### 5.3 IndexedDB 中没有数据

**可能原因**:

1. 数据库初始化失败
2. 事务未提交
3. 隐私浏览模式（数据仅在内存中）

**排查**:

```javascript
// 在 background 控制台运行
await storageManager.getStats();
// 应该显示 ipCacheCount 和 performanceDataCount
```

#### 5.4 清理和重置数据库

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
await saveIPCacheToStorage(tabId);
console.timeEnd('saveToStorage');

// 测量 popup 渲染时间
console.time('renderPopup');
displayResources(resources);
console.timeEnd('renderPopup');
```

## 代码规范

### JavaScript

- 使用 ES6+ 语法
- 使用 `const`/`let`,避免 `var`
- 使用 async/await,避免回调地狱
- 添加详细的日志和注释

### 命名规范

- 函数: `camelCase` (例: `startListeningForTab`)
- 常量: `UPPER_SNAKE_CASE` (例: `MAX_CACHE_SIZE`)
- 变量: `camelCase` (例: `tabListeners`)

### 错误处理

```javascript
// ✅ 好的做法
try {
  await storageManager.savePerformanceData(tabId, timing);
  console.log('✅ 保存成功');
} catch (error) {
  console.error('❌ 保存失败:', error);
}

// ❌ 避免
storageManager.savePerformanceData(tabId, timing); // 没有错误处理
```

## 发布流程

### 1. 版本更新

更新 `manifest.json` 和 `manifest.firefox.json` 中的版本号:

```json
{
  "version": "1.2.0"
}
```

### 2. 构建

```bash
# 清理调试日志
# 压缩代码 (可选)
# 生成 zip 包
```

### 3. 提交

- **Chrome Web Store**: 上传 zip 包
- **Firefox Add-ons**: 上传 zip 包

## 最佳实践

### 1. 性能

- ✅ IndexedDB 索引查询
- ✅ 批量操作 DOM
- ✅ 按需创建监听器
- ✅ 及时清理资源

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

## 资源

### 文档

- [Chrome Extension API](https://developer.chrome.com/docs/extensions/)
- [MDN WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Navigation Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_timing_API)
- [Resource Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Resource_Timing_API)

### 工具

- [browser-polyfill](https://github.com/mozilla/webextension-polyfill)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Firefox Developer Tools](https://firefox-source-docs.mozilla.org/devtools-user/)
