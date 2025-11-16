# Page Load Time

[English](README.md) | [中文](#page-load-time)

一个功能强大的浏览器扩展，用于测量和分析网页加载性能。支持 Chrome、Firefox、Edge 等现代浏览器。

## 功能特性

- 📊 **导航计时分析**: 使用 PerformanceNavigationTiming API 获取详细的页面加载时间分解
- 🔍 **资源分析**: 查看所有子资源的详细性能指标
- 📑 **标签页界面**: 在导航计时和资源分析视图之间切换
- 🔗 **可点击资源**: 点击任何资源在新标签页中查看详细性能信息
- 🌐 **IP 地址追踪**: 显示每个资源的服务器 IP 地址
- 🚀 **现代 API**: 使用最新的 PerformanceNavigationTiming API（替代已弃用的 PerformanceTiming）
- 💾 **本地存储**: 使用 IndexedDB 存储性能数据，支持跨浏览器上下文共享
- 🔄 **自动清理**: 自动清理过期数据，防止存储溢出

## 项目状态

该扩展已使用现代 Web 性能 API 进行更新，并增强了功能以提供更好的性能分析体验。

## 安装

### 从应用商店安装

- **Firefox**: [Mozilla Add-ons](https://addons.mozilla.org/en-CA/firefox/addon/load-timer/)
- **Chrome/Brave**: [Chrome Web Store](https://chrome.google.com/webstore/detail/page-load-time/fploionmjgeclbkemipmkogoaohcdbig/)
- **Edge**: [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/page-load-time/llcdjocbfkdndmjbgpaibfkdjkjogeho)

### 本地开发安装

#### Chrome/Edge

1. 打开 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择项目的 `src` 目录

#### Firefox

1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击"临时载入附加组件"
3. 选择 `src/manifest.firefox.json`

## 快速开始

### 项目结构

```
page-load-time/
├── src/                          # 源代码
│   ├── background.js             # Background Script (Service Worker)
│   ├── performance.js            # Content Script (页面注入)
│   ├── popup.html/js/css         # Popup UI
│   ├── storage-manager.js        # IndexedDB 存储管理器
│   ├── manifest.json             # Chrome manifest
│   ├── manifest.firefox.json     # Firefox manifest
│   └── fonts/                    # 字体资源
├── build/                        # 构建输出
├── docs/                         # 文档
│   ├── architecture.md           # 架构设计
│   └── development.md            # 开发指南
├── screenshots/                  # 截图
└── README.md                     # 本文件
```

### 开发

详细的开发指南请参考 [docs/development.md](docs/development.md)

主要内容包括：

- 环境设置和扩展加载
- 调试技巧和常用命令
- 日志系统说明
- 常见问题排查
- 代码规范和最佳实践

### 架构

详细的架构设计请参考 [docs/architecture.md](docs/architecture.md)

主要内容包括：

- 核心组件说明
- 关键设计决策
- 数据流和生命周期
- 性能优化策略
- 跨浏览器兼容性

## 核心特性

### 性能指标

扩展收集以下性能指标：

| 指标 | 说明 |
|------|------|
| DNS 查询时间 | 域名解析耗时 |
| TCP 连接时间 | 建立连接耗时 |
| TLS 握手时间 | HTTPS 握手耗时 |
| 首字节时间 (TTFB) | 收到第一个字节的时间 |
| 内容下载时间 | 下载响应体耗时 |
| DOM 解析时间 | 解析 HTML 耗时 |
| 资源加载时间 | 加载所有资源耗时 |
| 总加载时间 | 页面完全加载耗时 |

### 资源分析

对每个资源显示：

- 资源 URL
- 资源类型 (script, stylesheet, image 等)
- 加载时间
- 资源大小
- 服务器 IP 地址
- 详细的性能时间分解

## 技术栈

- **API**: WebExtensions API, Performance Navigation Timing API, Resource Timing API
- **存储**: IndexedDB
- **兼容性**: browser-polyfill.js
- **浏览器**: Chrome, Firefox, Edge

## 权限说明

扩展请求以下权限：

| 权限 | 用途 |
|------|------|
| `webRequest` | 监听网络请求以收集 IP 地址 |
| `webNavigation` | 监听导航事件以启动监听器 |
| `storage` | 存储性能数据和 IP 缓存 |
| `tabs` | 访问标签页信息 |
| `activeTab` | 访问当前标签页 |
| `<all_urls>` | 访问所有网站 |

## 隐私和安全

- ✅ **本地处理**: 所有数据在本地处理，不上传到任何服务器
- ✅ **数据隔离**: 每个标签页的数据独立存储
- ✅ **自动清理**: 标签页关闭时自动清理相关数据，定期清理过期数据
- ✅ **隐私模式**: 隐私浏览模式下数据仅在内存中存储
- ✅ **最小权限**: 只请求必要的权限

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE.md](LICENSE.md)

## 贡献

欢迎提交 Issue 和 Pull Request！

## 相关资源

- [Chrome Extension API 文档](https://developer.chrome.com/docs/extensions/)
- [MDN WebExtensions 文档](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Navigation Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_timing_API)
- [Resource Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Resource_Timing_API)
