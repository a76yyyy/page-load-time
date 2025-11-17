import { sendMessage } from "../utils/messaging";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_end",

  async main() {
    // 使用标志防止 startCollect 同时执行多次(但允许重试)
    let isRunning = false;

    async function startCollect() {
      // 防止同时执行多个 startCollect
      if (isRunning) {
        console.debug("[Performance] ⚠️ startCollect 正在运行,跳过重复调用");
        return;
      }
      isRunning = true;

      try {
        const navigationEntry = performance.getEntriesByType(
          "navigation"
        )[0] as PerformanceNavigationTiming;
        const resourceEntries = performance.getEntriesByType(
          "resource"
        ) as PerformanceResourceTiming[];

        // 使用PerformanceNavigationTiming数据
        const timing: any = navigationEntry.toJSON();
        timing.serverTiming = navigationEntry.serverTiming.map((timing) =>
          timing.toJSON()
        );

        // 一次性获取所有 IP 数据 - 使用新的消息协议
        let ipCache: Record<string, string> = {};
        try {
          ipCache = await sendMessage("getIPData");
          console.debug(
            "[Performance] 📥 收到 IP 缓存:",
            Object.keys(ipCache).length,
            "条记录"
          );
        } catch (e) {
          console.warn("[Performance] ⚠️ 获取 IP 缓存失败:", e);
        }

        // 为主文档设置 IP 地址
        const mainDocIP = ipCache[timing.name];
        if (mainDocIP) {
          timing.remoteIPAddress = mainDocIP;
        }

        // 为每个资源设置 IP 地址
        const resourcesWithIP = resourceEntries.map((entry) => {
          const ipData = ipCache[entry.name];
          const remoteIPAddress = ipData || "unknown";

          // 使用 toJSON() 确保所有数据都可以序列化
          // 这避免了 PerformanceServerTiming 等无法克隆的对象
          const entryJson = entry.toJSON();
          entryJson.serverTiming = entry.serverTiming.map((timing) =>
            timing.toJSON()
          );
          entryJson.remoteIPAddress = remoteIPAddress;

          return entryJson;
        });

        timing.resources = resourcesWithIP;

        // 数据收集完成后,停止监听该 tab 的请求 - 使用新的消息协议
        try {
          await sendMessage("stopListening");
        } catch (e) {
          console.warn("[Performance] ⚠️ 停止监听失败:", e);
        }

        // 设置开始时间
        timing.start = timing.fetchStart;

        // 记录页面加载开始的绝对时间戳(毫秒)
        timing.startTimestamp = performance.timeOrigin + timing.fetchStart;

        if (timing.duration > 0) {
          // fetchStart sometimes negative in FF, make an adjustment based on fetchStart
          const adjustment = timing.fetchStart < 0 ? -timing.fetchStart : 0;
          const fields = [
            "domainLookupStart",
            "domainLookupEnd",
            "connectStart",
            "connectEnd",
            "requestStart",
            "responseStart",
            "responseEnd",
            "domComplete",
            "domInteractive",
            "domContentLoadedEventStart",
            "domContentLoadedEventEnd",
            "loadEventStart",
            "loadEventEnd",
            "duration",
          ];

          fields.forEach((field) => {
            if (timing[field] !== undefined) {
              timing[field] += adjustment;
            }
          });

          // we have only 4 chars in our disposal including decimal point (3 in Firefox 92+)
          const isFF = navigator.userAgent.indexOf("Firefox") > -1;
          const duration = timing.duration / 1000;
          const precision = duration >= 100 ? 0 : duration >= 10 ? 1 : 2;
          const finalPrecision = isFF ? Math.max(0, precision - 1) : precision;
          const time = duration
            .toFixed(finalPrecision)
            .substring(0, isFF ? 3 : 4);

          // 使用新的消息协议发送性能数据
          console.debug("[Performance] 📤 发送性能数据:", { time, timing });
          sendMessage("savePerformanceData", {
            time: time,
            timing: timing,
          }).catch((reason) =>
            console.error("[Performance] ❌ 发送消息失败:", reason)
          );
        } else {
          setTimeout(startCollect, 100);
        }
      } finally {
        // 执行完成后重置标志,允许下次重试
        isRunning = false;
      }
    }

    // 根据页面加载状态决定何时调用 startCollect
    if (document.readyState === "complete") {
      // 页面已加载完成,立即调用
      await startCollect();
    } else {
      // 页面还在加载,等待 load 事件
      window.addEventListener("load", startCollect, { once: true });
    }
  },
});
