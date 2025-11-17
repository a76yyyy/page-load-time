import {
  registerStorageService,
  getStorageService,
} from "../services/storage.service";
import { browser } from "wxt/browser";
import { onMessage } from "../utils/messaging";

export default defineBackground(() => {
  console.log("[Background] 🚀 Background script loaded");

  // 注册存储服务
  registerStorageService();

  const storage = getStorageService();

  // 兼容不同浏览器的 action API
  // Firefox MV2 使用 browserAction, Chrome MV3 使用 action
  const actionAPI = browser.action || browser.browserAction;

  // 使用 Parameters 工具类型从 addListener 推断正确的类型
  type WebRequestListener = Parameters<
    typeof browser.webRequest.onCompleted.addListener
  >[0];
  const tabListeners = new Map<number, WebRequestListener>();

  // 启动监听
  function startListeningForTab(tabId: number) {
    if (tabListeners.has(tabId)) {
      console.debug(`[Background] Tab ${tabId} 已在监听,跳过`);
      return;
    }

    console.info(`[Background] 🚀 开始监听 Tab ${tabId}`);

    const listener: WebRequestListener = (details) => {
      if (details.ip && details.tabId === tabId) {
        console.debug(
          `[Background] 📡 收集 IP: ${details.ip} for ${details.url}`
        );
        storage.saveIPData(details.url, details.ip, tabId).catch((error) => {
          console.error(`[Background] ❌ 保存 IP 数据失败:`, error);
        });
      } else {
        // 调试:记录未收集到 IP 的请求
        console.debug(
          `[Background] 📡 未收集到 IP for ${details.url} (tabId: ${
            details.tabId
          }, hasIP: ${!!details.ip})`
        );
      }
    };

    browser.webRequest.onCompleted.addListener(
      listener,
      { urls: ["<all_urls>"], tabId },
      ["responseHeaders"]
    );

    tabListeners.set(tabId, listener);
    console.debug(
      `[Background] ✅ 监听器已注册,当前监听 ${tabListeners.size} 个标签页`
    );
  }

  // 停止监听
  function stopListeningForTab(tabId: number) {
    const listener = tabListeners.get(tabId);
    if (listener) {
      console.info(`[Background] 🛑 停止监听 Tab ${tabId}`);
      browser.webRequest.onCompleted.removeListener(listener);
      tabListeners.delete(tabId);
      console.debug(
        `[Background] ✅ 监听器已移除,剩余 ${tabListeners.size} 个标签页`
      );
    } else {
      console.debug(`[Background] Tab ${tabId} 已停止监听, 无需停止`);
    }
  }

  // 检查 URL 是否应该被监听
  function shouldMonitorUrl(url: string): boolean {
    const ignoredProtocols = [
      "about:",
      "chrome:",
      "chrome-extension:",
      "moz-extension:",
      "edge:",
      "opera:",
      "vivaldi:",
      "brave:",
      "file:",
      "data:",
      "javascript:",
      "view-source:",
    ];

    return !ignoredProtocols.some((protocol) => url.startsWith(protocol));
  }

  // 导航事件监听
  browser.webNavigation.onBeforeNavigate.addListener((details) => {
    // 只处理主框架的导航,忽略 iframe
    if (details.frameId !== 0) {
      return;
    }

    // 过滤掉特殊协议的页面
    if (!shouldMonitorUrl(details.url)) {
      console.debug(`[Background] ⏭️ 跳过特殊页面: ${details.url}`);
      return;
    }

    console.info(
      `[Background] 🧭 导航开始: Tab ${details.tabId} → ${details.url}`
    );
    startListeningForTab(details.tabId);
  });

  // 使用 @webext-core/messaging 注册消息处理器
  // 这提供了类型安全的消息传递,完全避免了消息格式冲突

  // 处理开始监听请求
  onMessage("startListening", (message) => {
    const sender = message.sender;
    if (!sender.tab?.id) {
      console.warn("[Background] ⚠️ startListening: 无法获取标签页 ID");
      return;
    }

    console.info(`[Background] 🎯 收到开始监听请求: Tab ${sender.tab.id}`);
    // 立即启动监听,确保不会错过任何请求
    startListeningForTab(sender.tab.id);
  });

  // 处理停止监听请求
  onMessage("stopListening", (message) => {
    const sender = message.sender;
    if (!sender.tab?.id) {
      console.warn("[Background] ⚠️ stopListening: 无法获取标签页 ID");
      return;
    }

    console.info(`[Background] 🎯 收到停止监听请求: Tab ${sender.tab.id}`);
    // 立即停止监听
    stopListeningForTab(sender.tab.id);
  });

  // 处理获取 IP 数据请求
  onMessage("getIPData", async (message) => {
    const sender = message.sender;
    if (!sender.tab?.id) {
      console.warn("[Background] ⚠️ 无法获取标签页 ID");
      return {};
    }

    try {
      const ipCache = await storage.getIPDataByTab(sender.tab.id);
      console.debug(
        `[Background] 📤 返回 Tab ${sender.tab.id} 的所有 IP 数据:`,
        Object.keys(ipCache).length + " 条记录"
      );
      return ipCache;
    } catch (error) {
      console.error("[Background] ❌ 获取 IP 数据失败:", error);
      return {};
    }
  });

  // 处理保存性能数据请求
  onMessage("savePerformanceData", async (message) => {
    const sender = message.sender;
    if (!sender.tab?.id) {
      console.warn("[Background] ⚠️ 无法获取标签页 ID");
      return { success: false };
    }

    try {
      const { time, timing } = message.data;

      console.info(
        `[Background] 📊 收到性能数据: Tab ${sender.tab.id}, duration: ${timing.duration}ms`
      );
      await storage.savePerformanceData(sender.tab.id, timing);
      console.info(
        `[Background] 💾 性能数据已保存到 IndexedDB: Tab ${sender.tab.id}`
      );

      // 验证数据是否真的保存了
      const saved = await storage.getPerformanceData(sender.tab.id);
      if (saved) {
        console.debug(`[Background] ✅ 验证成功: 数据已在 IndexedDB 中`);
      } else {
        console.error(`[Background] ❌ 验证失败: 数据未在 IndexedDB 中找到`);
      }

      // 使用兼容的 action API
      if (actionAPI) {
        await actionAPI.setBadgeText({
          text: time,
          tabId: sender.tab.id,
        });
        await actionAPI.setPopup({
          tabId: sender.tab.id,
          popup: "/popup.html",
        });
      }

      return { success: true };
    } catch (error) {
      console.error("[Background] ❌ 保存性能数据失败:", error);
      return { success: false, error: String(error) };
    }
  });

  // 标签页关闭清理
  browser.tabs.onRemoved.addListener((tabId) => {
    console.info(`[Background] 🗑️ Tab ${tabId} 已关闭,开始清理`);
    if (tabListeners.has(tabId)) {
      stopListeningForTab(tabId);
    }

    storage.deleteTabData(tabId).catch((error) => {
      console.error(`[Background] ❌ 清理 Tab ${tabId} 的数据失败:`, error);
    });
  });

  // 定期清理过期数据（每 30 分钟）
  setInterval(() => {
    storage.cleanupOldData().catch((error) => {
      console.error("[Background] ❌ 清理过期数据失败:", error);
    });
  }, 30 * 60 * 1000);

  console.log("[Background] ✅ Background script initialized");
});
