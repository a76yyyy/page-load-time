// 环境检测:只在 Service Worker 环境中使用 importScripts (Chrome)
// Firefox 会通过 manifest.json 的 scripts 数组自动加载这些文件
if (typeof importScripts === 'function') {
  try { importScripts('browser-polyfill.min.js'); } catch (e) {
    console.error('[Background] ❌ 加载 browser-polyfill 失败:', e);
  }
  try { importScripts('storage-manager.js'); } catch (e) {
    console.error('[Background] ❌ 加载 storage-manager 失败:', e);
  }
}

// 存储每个 tab 的监听器引用
const tabListeners = new Map();

// 在 Service Worker 上下文中创建并初始化 IndexedDB 存储管理器
console.debug('[Background] 🔧 检查 PageLoadStorageManager 类:', typeof PageLoadStorageManager);
if (typeof PageLoadStorageManager === 'undefined') {
  console.error('[Background] ❌ PageLoadStorageManager 类不存在！');
}

const storageManager = new PageLoadStorageManager();
let storageReady = false;
storageManager.init().then(() => {
  storageReady = true;
  console.info('[Background] ✅ 存储管理器初始化完成');
  // 定期清理过期数据（每 30 分钟）
  setInterval(() => {
    storageManager.cleanupOldData();
  }, 30 * 60 * 1000);
}).catch(error => {
  console.error('[Background] ❌ 存储管理器初始化失败:', error?.message || String(error), error?.stack);
});

// 开始监听指定 tab 的请求
function startListeningForTab(tabId) {
  // 如果已经在监听,直接返回,避免重复创建监听器
  if (tabListeners.has(tabId)) {
    console.debug(`[Background] Tab ${tabId} 已在监听,跳过`);
    return;
  }

  console.info(`[Background] 🚀 开始监听 Tab ${tabId}`);

  // 创建该 tab 的监听器
  const listener = (details) => {
    if (details.ip && details.tabId === tabId) {
      console.debug(`[Background] 📡 收集 IP: ${details.ip} for ${details.url}`);

      // 异步保存到 IndexedDB
      if (storageReady) {
        storageManager.saveIPData(details.url, details.ip, tabId).catch(error => {
          console.error(`[Background] ❌ 保存 IP 数据失败:`, error?.message || String(error), error?.stack);
        });
      }
    } else {
      console.debug(`[Background] 📡 未收集到 IP for ${details.url}`);
    }
  };

  // 注册监听器
  browser.webRequest.onCompleted.addListener(
    listener,
    {
      urls: ["<all_urls>"],
      tabId: tabId
    },
    ["responseHeaders"]  // 需要这个参数才能获取 IP 地址
  );

  // 保存监听器引用
  tabListeners.set(tabId, listener);
  console.debug(`[Background] ✅ 监听器已注册,当前监听 ${tabListeners.size} 个标签页`);
}

// 停止监听指定 tab 的请求
function stopListeningForTab(tabId) {
  const listener = tabListeners.get(tabId);
  if (listener) {
    console.info(`[Background] 🛑 停止监听 Tab ${tabId}`);
    browser.webRequest.onCompleted.removeListener(listener);
    tabListeners.delete(tabId);
    console.debug(`[Background] ✅ 监听器已移除,剩余 ${tabListeners.size} 个标签页`);
  }
}

// Setting a toolbar badge text
browser.runtime.onMessage.addListener((request, sender) => {
  // 处理开始监听请求
  if (request.action === 'startListening' && sender.tab) {
    startListeningForTab(sender.tab.id);
    return Promise.resolve({ success: true });
  }

  // 处理停止监听请求
  if (request.action === 'stopListening' && sender.tab) {
    stopListeningForTab(sender.tab.id);
    return Promise.resolve({ success: true });
  }

  // 处理获取 IP 数据的请求
  if (request.action === 'getIPData' && sender.tab) {
    return (async () => {
      try {
        if (!storageReady) {
          console.warn('[Background] ⚠️ 存储管理器未就绪');
          return {};
        }

        // 从 IndexedDB 读取该 tab 的所有 IP 数据
        const ipCache = await storageManager.getIPDataByTab(sender.tab.id);

        console.debug(`[Background] 📤 返回 Tab ${sender.tab.id} 的所有 IP 数据:`,
          Object.keys(ipCache).length + ' 条记录');

        return ipCache;
      } catch (error) {
        console.error('[Background] ❌ 获取 IP 数据失败:', error?.message || String(error), error?.stack);
        return {};
      }
    })();
  }

  // 原有的性能数据处理逻辑
  if (request.timing) {
    // This cache stores page load time for each tab, so they don't interfere
    // 不需要返回值,所以不返回 Promise
    (async () => {
      try {
        console.info(`[Background] 📊 收到性能数据: Tab ${sender.tab.id}, duration: ${request.timing.duration}ms`);
        if (storageReady) {
          // 保存到 IndexedDB
          await storageManager.savePerformanceData(sender.tab.id, request.timing);
          console.info(`[Background] 💾 性能数据已保存到 IndexedDB: Tab ${sender.tab.id}`);

          // 验证数据是否真的保存了
          const saved = await storageManager.getPerformanceData(sender.tab.id);
          if (saved) {
            console.debug(`[Background] ✅ 验证成功: 数据已在 IndexedDB 中`);
          } else {
            console.error(`[Background] ❌ 验证失败: 数据未在 IndexedDB 中找到`);
          }
        } else {
          console.warn(`[Background] ⚠️ 存储管理器未就绪，无法保存性能数据`);
        }
        await browser.action.setBadgeText({ text: request.time, tabId: sender.tab.id });
        await browser.action.setPopup({ tabId: sender.tab.id, popup: "popup.html" });
      } catch (error) {
        console.error('[Background] ❌ 保存性能数据失败:', error?.message || String(error), error?.stack);
      }
    })();
    // 不需要响应,返回 undefined
    return;
  }
});

// cache eviction
browser.tabs.onRemoved.addListener(tabId => {
  console.info(`[Background] 🗑️ Tab ${tabId} 已关闭,开始清理`);

  // 停止监听
  stopListeningForTab(tabId);

  // 清理 IndexedDB 中的数据
  if (storageReady) {
    storageManager.deleteTabData(tabId).catch(error => {
      console.error(`[Background] ❌ 清理 Tab ${tabId} 的数据失败:`, error?.message || String(error), error?.stack);
    });
  }
});

// 监听导航事件 - 在任何网络请求之前触发
browser.webNavigation.onBeforeNavigate.addListener((details) => {
  // 只处理主框架的导航,忽略 iframe
  if (details.frameId !== 0) {
    return;
  }

  console.info(`[Background] 🧭 导航开始: Tab ${details.tabId} → ${details.url}`);

  // 在导航开始时就启动监听器,确保不会错过任何请求
  startListeningForTab(details.tabId);
});
