var total = 0;
var currentTiming = null;

function set(id, start, end, noacc) {
  var length = Math.round(end - start);
  var x = Math.round(start / total * 300);
  document.getElementById(id + 'When').innerHTML = Math.round(start);
  document.getElementById(id).innerHTML = length;
  document.getElementById(id + 'Total').innerHTML = noacc ? '-' : Math.round(end);
  document.getElementById('r-' + id).style.cssText =
    'background-size:' + Math.round(length / total * 300) + 'px 100%;' +
    'background-position-x:' + (x >= 300 ? 299 : x) + 'px;';
}

// 标签页切换功能
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.dataset.tab;

      // 移除所有active类
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // 添加active类到当前标签
      button.classList.add('active');
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
}

// 计算资源加载的时间范围
function calculateResourceTimeRange(resources) {
  if (!resources || resources.length === 0) return { min: 0, max: 0 };

  let minStart = Infinity;
  let maxEnd = 0;

  resources.forEach(resource => {
    const start = resource.startTime;
    const end = resource.startTime + resource.duration;

    if (start < minStart) minStart = start;
    if (end > maxEnd) maxEnd = end;
  });

  return { min: minStart, max: maxEnd };
}

// 显示资源列表
function displayResources(resources) {
  const resourcesList = document.getElementById('resources-list');
  resourcesList.innerHTML = '';

  // 计算资源加载的时间范围
  const timeRange = calculateResourceTimeRange(resources);
  const resourceTotalTime = timeRange.max - timeRange.min;

  resources.forEach(resource => {
    const resourceItem = document.createElement('div');
    resourceItem.className = 'resource-item';

    const fileName = resource.name.split('/').pop() || resource.name;
    const size = resource.transferSize > 0 ?
      (resource.transferSize / 1024).toFixed(1) + ' KB' : 'cached';

    // 计算背景色位置和大小
    const relativeStart = resource.startTime - timeRange.min;
    const relativeDuration = resource.duration;
    const backgroundSize = Math.max(1, Math.round(relativeDuration / resourceTotalTime * 300));
    const backgroundPosition = Math.round(relativeStart / resourceTotalTime * 300);

    resourceItem.innerHTML = `
      <div class="resource-main">
        <span class="resource-name" title="${resource.name}">${fileName}</span>
        <span class="resource-type">${resource.initiatorType || 'unknown'}</span>
        <span class="resource-duration">${Math.round(resource.duration)}ms</span>
        <span class="resource-size">${size}</span>
      </div>
      <div class="resource-details" style="display: none;">
        <div class="detail-row">
          <span class="label">URL:</span>
          <span class="value url">${resource.name}</span>
        </div>
        <div class="detail-row">
          <span class="label">Type:</span>
          <span class="value">${resource.initiatorType || 'unknown'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Duration:</span>
          <span class="value">${Math.round(resource.duration)}ms</span>
        </div>
        <div class="detail-row">
          <span class="label">Start Time:</span>
          <span class="value">${Math.round(resource.startTime)}ms</span>
        </div>
        <div class="detail-row">
          <span class="label">Transfer Size:</span>
          <span class="value">${resource.transferSize > 0 ? resource.transferSize + ' bytes' : 'cached'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Encoded Size:</span>
          <span class="value">${resource.encodedBodySize} bytes</span>
        </div>
        <div class="detail-row">
          <span class="label">Decoded Size:</span>
          <span class="value">${resource.decodedBodySize} bytes</span>
        </div>
        <div class="detail-row">
          <span class="label">Protocol:</span>
          <span class="value">${resource.nextHopProtocol || 'unknown'}</span>
        </div>
        <div class="detail-row">
          <span class="label">Status:</span>
          <span class="value">${resource.responseStatus || 'unknown'}</span>
        </div>
        ${resource.serverTiming && resource.serverTiming.length > 0 ?
        `<div class="detail-row">
          <span class="label">Server Timing:</span>
          <span class="value">${JSON.stringify(resource.serverTiming)}</span>
        </div>` : ''}
      </div>
    `;

    // 设置背景色
    resourceItem.style.cssText = `
      background-size: ${backgroundSize}px 100%;
      background-position-x: ${backgroundPosition >= 300 ? 299 : backgroundPosition}px;
    `;

    // 添加点击事件 - 点击整个资源项展开/折叠
    const detailsElement = resourceItem.querySelector('.resource-details');

    resourceItem.addEventListener('click', () => {
      const isExpanded = detailsElement.style.display !== 'none';
      if (isExpanded) {
        detailsElement.style.display = 'none';
      } else {
        detailsElement.style.display = 'block';
      }
    });

    resourcesList.appendChild(resourceItem);
  });
}

// 导出数据
function exportData() {
  if (!currentTiming) return;

  // 从 URL 中提取域名
  let domain = 'unknown';
  try {
    const urlObj = new URL(currentTiming.name);
    domain = urlObj.hostname.replace(/\./g, '_'); // 将点替换为下划线,避免文件名问题
  } catch (e) {
    console.error('Failed to parse URL:', e);
  }

  const data = {
    timestamp: new Date(currentTiming.startTimestamp).toISOString(),
    url: currentTiming.name,
    navigationTiming: currentTiming,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `page-timing-${domain}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 初始化
function init() {
  setupTabs();

  browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    var tab = tabs[0];
    browser.storage.local.get('cache').then(data => {
      if (!data.cache || !data.cache['tab' + tab.id]) {
        document.getElementById('container').innerHTML = '<p>No timing data available for this page.</p>';
        return;
      }

      var t = data.cache['tab' + tab.id];
      currentTiming = t;
      total = t.duration;

      // https://dvcs.w3.org/hg/webperf/raw-file/tip/specs/NavigationTiming/Overview.html#processing-model
      set('redirect', t.redirectStart, t.redirectEnd);
      set('dns', t.domainLookupStart, t.domainLookupEnd);
      set('connect', t.connectStart, t.connectEnd);
      set('request', t.requestStart, t.responseStart);
      set('response', t.responseStart, t.responseEnd);
      set('dom', t.responseEnd, t.domComplete);
      set('domParse', t.responseEnd, t.domInteractive);
      set('domScripts', t.domInteractive, t.domContentLoadedEventStart);
      set('contentLoaded', t.domContentLoadedEventStart, t.domContentLoadedEventEnd);
      set('domSubRes', t.domContentLoadedEventEnd, t.domComplete);
      set('load', t.loadEventStart, t.loadEventEnd);
      document.getElementById("total").innerHTML = Math.round(t.duration);

      // 使用 startTimestamp 显示页面加载开始时间,格式化为本地时区
      const startTime = new Date(t.startTimestamp);
      const formattedTime = startTime.toLocaleString(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });
      document.getElementById("requestStart").innerHTML = formattedTime;

      // 显示资源列表
      if (t.resources && t.resources.length > 0) {
        displayResources(t.resources);
      }
    });
  });
  // 绑定导出按钮事件
  const exportButton = document.getElementById('export-button');
  if (exportButton) {
    exportButton.addEventListener('click', exportData);
  }
  // Sub Resources 点击事件
  document.getElementById('subResourcesLink').addEventListener('click', () => {
    document.querySelector('.tab-button[data-tab="resources"]').click();
  });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
