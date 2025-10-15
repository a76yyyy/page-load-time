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

// 查看内存缓存
console.log('Memory cache:', ipCacheMemory);

// 查看 storage
browser.storage.local.get(null).then(console.log);

// 清空缓存
browser.storage.local.clear();
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
[DEBUG] 📦 为 Tab 123 创建内存缓存对象
[DEBUG] 🚀 开始监听 Tab 123
[DEBUG] ✅ 监听器已注册,当前监听 1 个标签页
[DEBUG] 📡 收集 IP: 1.2.3.4 for https://example.com/
[DEBUG] 📡 收集 IP: 5.6.7.8 for https://cdn.example.com/style.css
[DEBUG] 💾 保存 Tab 123 的 IP 数据到 storage: 2 条记录
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

// 检查内存缓存
console.log('Memory cache:', ipCacheMemory);

// 检查 storage
browser.storage.local.get(null).then(console.log);
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
// 查看 storage 内容
browser.storage.local.get(null).then(data => {
  console.log('All storage:', data);
});

// 查看 storage 使用量
browser.storage.local.getBytesInUse().then(bytes => {
  console.log('Storage used:', bytes, 'bytes');
});
```

### 4. Popup 显示慢

**可能原因:**

- 资源列表过长 (100+ 资源)
- DOM 操作未优化

**解决方案:**

- 已使用 `DocumentFragment` 批量插入
- 考虑使用事件委托
- 考虑虚拟滚动 (200+ 资源时)

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
  await browser.storage.local.set(data);
  console.log('✅ 保存成功');
} catch (error) {
  console.error('❌ 保存失败:', error);
}

// ❌ 避免
browser.storage.local.set(data); // 没有错误处理
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

- ✅ 使用内存缓存减少 storage I/O
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
