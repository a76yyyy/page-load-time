(function () {
  'use strict';

  if (document.readyState === 'complete') {
    startCollect();
  } else {
    window.addEventListener('load', startCollect);
  }

  async function startCollect() {
    const navigationEntry = performance.getEntriesByType('navigation')[0];
    const resourceEntries = performance.getEntriesByType('resource');

    // 使用PerformanceNavigationTiming数据
    const timing = navigationEntry.toJSON();

    // 一次性获取所有 IP 数据
    let ipCache = {};
    try {
      ipCache = await browser.runtime.sendMessage({ action: 'getIPData' });
      console.log('[DEBUG] 📥 收到 IP 缓存:', Object.keys(ipCache).length, '条记录', ipCache);
    } catch (e) {
      console.log('Failed to get IP cache:', e);
    }

    // 为主文档设置 IP 地址
    const mainDocIP = ipCache[timing.name];
    if (mainDocIP && mainDocIP.ip) {
      timing.remoteIPAddress = mainDocIP.ip;
    }

    // 为每个资源设置 IP 地址
    const resourcesWithIP = resourceEntries.map(entry => {
      const ipData = ipCache[entry.name];
      const remoteIPAddress = (ipData && ipData.ip) ? ipData.ip : 'unknown';

      return {
        name: entry.name,
        entryType: entry.entryType,
        startTime: entry.startTime,
        duration: entry.duration,
        initiatorType: entry.initiatorType,
        nextHopProtocol: entry.nextHopProtocol,
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        decodedBodySize: entry.decodedBodySize,
        responseStatus: entry.responseStatus,
        serverTiming: entry.serverTiming,
        remoteIPAddress: remoteIPAddress
      };
    });

    timing.resources = resourcesWithIP;

    // 数据收集完成后,停止监听该 tab 的请求
    try {
      await browser.runtime.sendMessage({ action: 'stopListening' });
    } catch (e) {
      console.log('Failed to stop listening:', e);
    }

    // 设置开始时间
    timing.start = timing.fetchStart;

    // 记录页面加载开始的绝对时间戳(毫秒)
    timing.startTimestamp = performance.timeOrigin + timing.fetchStart;

    if (timing.duration > 0) {
      // fetchStart sometimes negative in FF, make an adjustment based on fetchStart
      var adjustment = timing.fetchStart < 0 ? -timing.fetchStart : 0;
      ['domainLookupStart',
        'domainLookupEnd',
        'connectStart',
        'connectEnd',
        'requestStart',
        'responseStart',
        'responseEnd',
        'domComplete',
        'domInteractive',
        'domContentLoadedEventStart',
        'domContentLoadedEventEnd',
        'loadEventStart',
        'loadEventEnd',
        'duration'
      ].forEach(i => {
        if (timing[i] !== undefined) {
          timing[i] += adjustment;
        }
      });

      // we have only 4 chars in our disposal including decimal point (3 in Firefox 92+)
      var isFF = navigator.userAgent.indexOf("Firefox") > -1;
      var duration = timing.duration / 1000;
      var precision = (duration >= 100) ? 0 : (duration >= 10 ? 1 : 2);
      if (isFF) {
        precision = Math.max(0, precision - 1);
      }
      var time = duration.toFixed(precision).substring(0, isFF ? 3 : 4);
      var promise = browser.runtime.sendMessage({ time: time, timing: timing });
      promise.catch((reason) => console.log(reason));
    } else {
      setTimeout(startCollect, 100);
    }
  }
})();
