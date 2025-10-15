try { importScripts('browser-polyfill.min.js'); } catch (e) { }

// 存储每个 tab 的监听器引用
const tabListeners = new Map();

// 内存缓存 - 避免 storage 竞态条件
// key: 'tab123', value: { url: {ip, timestamp} }
const ipCacheMemory = new Map();

// 开始监听指定 tab 的请求
function startListeningForTab(tabId) {
  // 如果已经在监听,直接返回,避免重复创建监听器
  if (tabListeners.has(tabId)) {
    console.log(`[DEBUG] Tab ${tabId} 已在监听,跳过`);
    return;
  }

  console.log(`[DEBUG] 🚀 开始监听 Tab ${tabId}`);

  // 创建该 tab 的监听器
  const listener = (details) => {
    if (details.ip && details.tabId === tabId) {
      console.log(`[DEBUG] 📡 收集 IP: ${details.ip} for ${details.url}`);

      // 直接写入内存缓存 - 无竞态条件!
      const tabKey = 'tab' + tabId;
      const tabCache = ipCacheMemory.get(tabKey);

      if (tabCache) {
        // 同步修改内存对象,这是原子操作
        tabCache[details.url] = {
          ip: details.ip,
          timestamp: Date.now()
        };
      }
    } else {
      console.log(`[DEBUG] 📡 未收集到 IP for ${details.url}`);
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
  console.log(`[DEBUG] ✅ 监听器已注册,当前监听 ${tabListeners.size} 个标签页`);
}

// 停止监听指定 tab 的请求
function stopListeningForTab(tabId) {
  const listener = tabListeners.get(tabId);
  if (listener) {
    console.log(`[DEBUG] 🛑 停止监听 Tab ${tabId}`);
    browser.webRequest.onCompleted.removeListener(listener);
    tabListeners.delete(tabId);
    console.log(`[DEBUG] ✅ 监听器已移除,剩余 ${tabListeners.size} 个标签页`);
  }
}

// 将内存缓存保存到 storage
async function saveIPCacheToStorage(tabId) {
  const tabKey = 'tab' + tabId;
  const tabCache = ipCacheMemory.get(tabKey);

  if (!tabCache) {
    return;
  }

  try {
    // 直接写入单个 key,避免与其他数据竞态
    const storageKey = 'ipCache_' + tabKey;
    await browser.storage.local.set({ [storageKey]: tabCache });

    console.log(`[DEBUG] 💾 保存 Tab ${tabId} 的 IP 数据到 storage:`,
      Object.keys(tabCache).length, '条记录');
  } catch (error) {
    console.error(`[DEBUG] ❌ 保存 IP 数据失败:`, error);
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
        const tabKey = 'tab' + sender.tab.id;

        // 先保存内存缓存到 storage
        await saveIPCacheToStorage(sender.tab.id);

        // 从内存缓存读取(最新数据)
        const tabCache = ipCacheMemory.get(tabKey);

        console.log(`[DEBUG] 📤 返回 Tab ${sender.tab.id} 的所有 IP 数据:`,
          tabCache ? Object.keys(tabCache).length + ' 条记录' : '无数据');

        return tabCache || {};
      } catch (error) {
        console.error('[DEBUG] ❌ 获取 IP 数据失败:', error);
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
        // 直接写入单个 key,避免与其他数据竞态
        const cacheKey = 'cache_tab' + sender.tab.id;
        await browser.storage.local.set({ [cacheKey]: request.timing });
        await browser.action.setBadgeText({ text: request.time, tabId: sender.tab.id });
        await browser.action.setPopup({ tabId: sender.tab.id, popup: "popup.html" });
        console.log(`[DEBUG] 💾 性能数据已保存: Tab ${sender.tab.id}`);
      } catch (error) {
        console.error('[DEBUG] ❌ 保存性能数据失败:', error);
      }
    })();
    // 不需要响应,返回 undefined
    return;
  }
});

// cache eviction
browser.tabs.onRemoved.addListener(tabId => {
  console.log(`[DEBUG] 🗑️ Tab ${tabId} 已关闭,开始清理`);

  // 停止监听
  stopListeningForTab(tabId);

  // 清理内存缓存 - 同步操作,立即生效
  const tabKey = 'tab' + tabId;
  ipCacheMemory.delete(tabKey);

  // 清理 storage 缓存 - 使用 remove 直接删除 key,无竞态
  const cacheKey = 'cache_tab' + tabId;
  const ipCacheKey = 'ipCache_tab' + tabId;

  browser.storage.local.remove([cacheKey, ipCacheKey]).then(() => {
    console.log(`[DEBUG] ✅ Tab ${tabId} 的 storage 缓存已清理`);
  }).catch(error => {
    console.error(`[DEBUG] ❌ 清理 Tab ${tabId} 的 storage 失败:`, error);
  });
});

// 监听导航事件 - 在任何网络请求之前触发
browser.webNavigation.onBeforeNavigate.addListener((details) => {
  // 只处理主框架的导航,忽略 iframe
  if (details.frameId !== 0) {
    return;
  }

  console.log(`[DEBUG] 🧭 导航开始: Tab ${details.tabId} → ${details.url}`);

  const tabKey = 'tab' + details.tabId;

  // 预先在内存中创建空对象 - 这是"原子队列"的关键!
  // 这会覆盖旧数据,无需手动清理
  ipCacheMemory.set(tabKey, {});
  console.log(`[DEBUG] 📦 为 Tab ${details.tabId} 创建内存缓存对象`);

  // 注意: storage 中的旧数据会在下次 saveIPCacheToStorage 时被覆盖
  // 无需在这里清理,避免竞态条件

  // 在导航开始时就启动监听器,确保不会错过任何请求
  startListeningForTab(details.tabId);
});
