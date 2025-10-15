var total = 0;
var currentTiming = null;
var currentResources = null; // 存储当前的资源列表
var sortState = {
  column: 'none', // 'none', 'duration', 'size'
  order: 'none'   // 'none', 'asc', 'desc'
};

function set(id, start, end, noacc) {
  var length = Math.round(end - start);
  // 动态获取容器宽度
  var containerWidth = document.getElementById('container').offsetWidth;
  var x = Math.round(start / total * containerWidth);
  document.getElementById(id + 'When').innerHTML = Math.round(start);
  document.getElementById(id).innerHTML = length;
  document.getElementById(id + 'Total').innerHTML = noacc ? '-' : Math.round(end);
  document.getElementById('r-' + id).style.cssText =
    'background-size:' + Math.round(length / total * containerWidth) + 'px 100%;' +
    'background-position-x:' + (x >= containerWidth ? containerWidth - 1 : x) + 'px;';
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

      // 当切换到 resources 标签页时,更新背景位置
      if (tabId === 'resources') {
        updateResourceBackgrounds();
      }
    });
  });
}

// 更新资源列表的背景位置(在标签页显示后)
function updateResourceBackgrounds() {
  const resourcesContainer = document.getElementById('resources-container');
  const containerWidth = resourcesContainer.offsetWidth;

  if (containerWidth === 0) return; // 容器仍然隐藏,不处理

  const resourceItems = document.querySelectorAll('.resource-item');
  resourceItems.forEach(item => {
    // 重新计算并设置背景位置
    const currentSize = item.style.backgroundSize;
    const currentPos = item.style.backgroundPositionX;

    // 如果已经有正确的值,不需要重新计算
    if (currentSize && currentSize !== '0px 100%') {
      return;
    }

    // 这里可以添加重新计算的逻辑,但通常初始值就是正确的
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

// 排序资源列表
function sortResources(resources, sortState) {
  if (sortState.order === 'none' || sortState.column === 'none') {
    return resources;
  }

  const sorted = [...resources].sort((a, b) => {
    let valueA, valueB;

    if (sortState.column === 'duration') {
      valueA = a.duration;
      valueB = b.duration;
    } else if (sortState.column === 'size') {
      // 处理 cached 资源: transferSize 为 0 表示 cached
      // cached 资源在排序时始终排在最后
      const isCachedA = a.transferSize === 0;
      const isCachedB = b.transferSize === 0;

      if (isCachedA && !isCachedB) {
        return 1; // A 是 cached,排在后面
      }
      if (!isCachedA && isCachedB) {
        return -1; // B 是 cached,排在后面
      }
      if (isCachedA && isCachedB) {
        return 0; // 都是 cached,保持原顺序
      }

      valueA = a.transferSize;
      valueB = b.transferSize;
    }

    if (sortState.order === 'asc') {
      return valueA - valueB;
    } else {
      return valueB - valueA;
    }
  });

  return sorted;
}

// 显示资源列表
function displayResources(resources, applySort = true) {
  // 保存原始资源列表(只在第一次调用时保存)
  if (!currentResources) {
    currentResources = resources;
  }

  // 应用排序
  const displayList = applySort ? sortResources(currentResources, sortState) : resources;

  const resourcesList = document.getElementById('resources-list');

  // 使用 DocumentFragment 批量插入,避免多次 reflow
  const fragment = document.createDocumentFragment();

  // 计算资源加载的时间范围(使用原始列表)
  const timeRange = calculateResourceTimeRange(currentResources);
  const resourceTotalTime = timeRange.max - timeRange.min;

  // 动态获取资源容器宽度
  const resourcesContainer = document.getElementById('resources-container');
  let containerWidth = resourcesContainer.offsetWidth;

  // 如果容器宽度为 0(标签页隐藏),使用 navigation 容器的宽度作为参考
  if (containerWidth === 0) {
    const navigationContainer = document.getElementById('container');
    containerWidth = navigationContainer.offsetWidth || 384;
  }

  displayList.forEach(resource => {
    const resourceItem = document.createElement('div');
    resourceItem.className = 'resource-item';

    const fileName = resource.name.split('/').pop() || resource.name;
    const size = resource.transferSize > 0 ?
      (resource.transferSize / 1024).toFixed(1) + ' KB' : 'cached';

    // 计算背景色位置和大小
    const relativeStart = resource.startTime - timeRange.min;
    const relativeDuration = resource.duration;
    const backgroundSize = Math.max(1, Math.round(relativeDuration / resourceTotalTime * containerWidth));
    const backgroundPosition = Math.round(relativeStart / resourceTotalTime * containerWidth);

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
        <div class="detail-row">
          <span class="label">Remote IP:</span>
          <span class="value">${resource.remoteIPAddress || 'unknown'}</span>
        </div>
        ${resource.serverTiming && resource.serverTiming.length > 0 ?
        `<div class="detail-row">
          <span class="label">Server Timing:</span>
          <span class="value">${JSON.stringify(resource.serverTiming)}</span>
        </div>` : ''}
      </div>
    `;

    // 设置背景色位置和大小(不覆盖 CSS 中的 background-image)
    resourceItem.style.backgroundSize = `${backgroundSize}px 100%`;
    resourceItem.style.backgroundPositionX = `${backgroundPosition >= containerWidth ? containerWidth - 1 : backgroundPosition}px`;

    // 调试信息
    console.log(`Resource: ${fileName}, containerWidth: ${containerWidth}, backgroundSize: ${backgroundSize}px, backgroundPosition: ${backgroundPosition}px`);

    fragment.appendChild(resourceItem);
  });

  // 一次性插入所有元素,避免多次 reflow
  resourcesList.innerHTML = '';
  resourcesList.appendChild(fragment);

  // 使用事件委托 - 只添加一个监听器
  resourcesList.addEventListener('click', (e) => {
    const resourceItem = e.target.closest('.resource-item');
    if (resourceItem) {
      const detailsElement = resourceItem.querySelector('.resource-details');
      const isExpanded = detailsElement.style.display !== 'none';
      detailsElement.style.display = isExpanded ? 'none' : 'block';
    }
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
    const cacheKey = 'cache_tab' + tab.id;
    browser.storage.local.get(cacheKey).then(data => {
      if (!data[cacheKey]) {
        document.getElementById('container').innerHTML = '<p>No timing data available for this page.</p>';
        return;
      }

      var t = data[cacheKey];
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

      // 显示主文档的 Remote IP
      if (t.remoteIPAddress) {
        document.getElementById("remoteIP").innerHTML = t.remoteIPAddress;
      } else {
        document.getElementById("remoteIP").innerHTML = 'unknown';
      }

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

  // 排序按钮点击事件
  const durationSortButton = document.getElementById('duration-sort');
  const sizeSortButton = document.getElementById('size-sort');

  if (durationSortButton) {
    durationSortButton.addEventListener('click', () => {
      // 如果当前是 duration 列排序,切换排序顺序
      if (sortState.column === 'duration') {
        if (sortState.order === 'asc') {
          sortState.order = 'desc';
        } else if (sortState.order === 'desc') {
          sortState.column = 'none';
          sortState.order = 'none';
        }
      } else {
        // 切换到 duration 列,默认升序
        sortState.column = 'duration';
        sortState.order = 'asc';
      }

      // 更新按钮样式
      durationSortButton.classList.remove('asc', 'desc');
      if (sizeSortButton) {
        sizeSortButton.classList.remove('asc', 'desc');
      }

      if (sortState.column === 'duration' && sortState.order !== 'none') {
        durationSortButton.classList.add(sortState.order);
      }

      // 重新显示资源列表
      if (currentResources) {
        displayResources(currentResources);
      }
    });
  }

  if (sizeSortButton) {
    sizeSortButton.addEventListener('click', () => {
      // 如果当前是 size 列排序,切换排序顺序
      if (sortState.column === 'size') {
        if (sortState.order === 'asc') {
          sortState.order = 'desc';
        } else if (sortState.order === 'desc') {
          sortState.column = 'none';
          sortState.order = 'none';
        }
      } else {
        // 切换到 size 列,默认升序
        sortState.column = 'size';
        sortState.order = 'asc';
      }

      // 更新按钮样式
      if (durationSortButton) {
        durationSortButton.classList.remove('asc', 'desc');
      }
      sizeSortButton.classList.remove('asc', 'desc');

      if (sortState.column === 'size' && sortState.order !== 'none') {
        sizeSortButton.classList.add(sortState.order);
      }

      // 重新显示资源列表
      if (currentResources) {
        displayResources(currentResources);
      }
    });
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
