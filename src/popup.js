var total = 0;
var currentTiming = null;
var currentResources = null; // 存储当前的资源列表
var sortState = {
  column: 'none', // 'none', 'duration', 'size'
  order: 'none'   // 'none', 'asc', 'desc'
};
var filterState = {
  types: ['all'] // 'all' 或具体的资源类型数组
};

// 在页面上下文中创建并初始化 PageLoadStorageManager
var storageManager = null;
var storageManagerReady = null;

if (typeof PageLoadStorageManager !== 'undefined') {
  console.log('[POPUP] 🔧 创建 PageLoadStorageManager 实例');
  storageManager = new PageLoadStorageManager();

  console.log('[POPUP] 📍 storageManager 实例:', storageManager);
  console.log('[POPUP] 📍 初始 db 状态:', storageManager.db);

  storageManagerReady = storageManager.init().then(() => {
    console.log('[POPUP] ✅ StorageManager 初始化完成');
    console.log('[POPUP] 📍 初始化后 db 状态:', storageManager.db);
    return storageManager;
  }).catch(error => {
    console.error('[POPUP] ❌ StorageManager 初始化失败:', error);
    throw error;
  });
} else {
  console.error('[POPUP] ❌ PageLoadStorageManager 类不存在！');
}

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

// 筛选资源列表
function filterResources(resources, filterState) {
  // 如果选择了 "All Types" 或没有选择任何类型,显示所有资源
  if (filterState.types.includes('all') || filterState.types.length === 0) {
    return resources;
  }

  return resources.filter(resource => {
    const resourceType = resource.initiatorType || 'unknown';
    return filterState.types.includes(resourceType);
  });
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

// 获取所有资源类型
function getResourceTypes(resources) {
  const types = new Set();
  resources.forEach(resource => {
    const type = resource.initiatorType || 'unknown';
    types.add(type);
  });
  return Array.from(types).sort();
}

// 初始化类型筛选器
function initTypeFilter(resources) {
  const typeFilter = document.getElementById('type-filter');
  if (!typeFilter) return;

  const types = getResourceTypes(resources);

  // 清空现有选项(保留 "All Types")
  typeFilter.innerHTML = `
    <label class="filter-option">
      <input type="checkbox" value="all" checked>
      <span>All Types</span>
    </label>
  `;

  // 添加所有类型选项
  types.forEach(type => {
    const label = document.createElement('label');
    label.className = 'filter-option';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = type;

    const span = document.createElement('span');
    span.textContent = type.charAt(0).toUpperCase() + type.slice(1);

    label.appendChild(checkbox);
    label.appendChild(span);
    typeFilter.appendChild(label);
  });
}

// 创建单个资源项的 DOM 元素
function createResourceElement(resource, timeRange, resourceTotalTime, containerWidth) {
  const resourceItem = document.createElement('div');
  resourceItem.className = 'resource-item';

  // 存储资源数据,用于排序时识别
  resourceItem.dataset.resourceName = resource.name;

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

  return resourceItem;
}

// 重新排序和筛选现有的 DOM 元素(不重新创建)
function reorderResourceElements(sortedResources, filteredResources) {
  const resourcesList = document.getElementById('resources-list');
  const existingElements = Array.from(resourcesList.children);

  // 创建一个映射,从资源名称到 DOM 元素
  const elementMap = new Map();
  existingElements.forEach(element => {
    const resourceName = element.dataset.resourceName;
    if (resourceName) {
      elementMap.set(resourceName, element);
    }
  });

  // 创建筛选后的资源名称集合,用于快速查找
  const filteredResourceNames = new Set(filteredResources.map(r => r.name));

  // 使用 DocumentFragment 批量重新排序
  const fragment = document.createDocumentFragment();
  sortedResources.forEach(resource => {
    const element = elementMap.get(resource.name);
    if (element) {
      // 根据筛选状态显示或隐藏元素
      if (filteredResourceNames.has(resource.name)) {
        element.style.display = '';
        fragment.appendChild(element);
      } else {
        element.style.display = 'none';
      }
    }
  });

  // 一次性更新 DOM
  resourcesList.innerHTML = '';
  resourcesList.appendChild(fragment);

  // 将隐藏的元素也添加回去,保持 DOM 完整性
  existingElements.forEach(element => {
    const resourceName = element.dataset.resourceName;
    if (resourceName && !filteredResourceNames.has(resourceName)) {
      element.style.display = 'none';
      resourcesList.appendChild(element);
    }
  });
}

// 显示资源列表
function displayResources(resources, applySort = true, applyFilter = true) {
  // 保存原始资源列表(只在第一次调用时保存)
  if (!currentResources) {
    currentResources = resources;
  }

  const resourcesList = document.getElementById('resources-list');

  // 如果是排序/筛选操作且 DOM 已经存在,只重新排序和筛选,不重新创建
  if (resourcesList.children.length > 0) {
    const filteredResources = applyFilter ? filterResources(currentResources, filterState) : currentResources;
    const sortedResources = applySort ? sortResources(filteredResources, sortState) : filteredResources;
    reorderResourceElements(sortedResources, filteredResources);
    return;
  }

  // 首次渲染:创建所有 DOM 元素
  let displayList = currentResources;
  if (applyFilter) {
    displayList = filterResources(displayList, filterState);
  }
  if (applySort) {
    displayList = sortResources(displayList, sortState);
  }

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
    const resourceItem = createResourceElement(resource, timeRange, resourceTotalTime, containerWidth);
    fragment.appendChild(resourceItem);
  });

  // 一次性插入所有元素,避免多次 reflow
  resourcesList.innerHTML = '';
  resourcesList.appendChild(fragment);
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

    // 从 IndexedDB 获取性能数据
    if (storageManagerReady) {
      // 使用共享的初始化 Promise
      storageManagerReady.then(() => {
        console.log('[POPUP] 📊 正在获取 Tab', tab.id, '的性能数据');
        return storageManager.getPerformanceData(tab.id);
      }).then(result => {
        console.log('[POPUP] 📥 获取到的数据:', result);
        if (!result || !result.timing) {
          console.info('[POPUP] ⚠️ 没有找到性能数据');
          document.getElementById('container').innerHTML = '<p>No timing data available for this page.</p>';
          return;
        }
        console.log('[POPUP] ✅ 性能数据加载成功');

        var t = result.timing;
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
          // 初始化类型筛选器
          initTypeFilter(t.resources);
          displayResources(t.resources);
        }
      }).catch(error => {
        console.error('[POPUP] ❌ 获取性能数据失败:', error);
        document.getElementById('container').innerHTML = '<p>Error loading timing data.</p>';
      });
    } else {
      console.error('[POPUP] ❌ storageManagerReady 不存在');
      document.getElementById('container').innerHTML = '<p>Storage manager not initialized.</p>';
    }
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

  // 资源列表点击事件 - 使用事件委托,只绑定一次
  const resourcesList = document.getElementById('resources-list');
  if (resourcesList) {
    resourcesList.addEventListener('click', (e) => {
      const resourceItem = e.target.closest('.resource-item');
      if (resourceItem) {
        const detailsElement = resourceItem.querySelector('.resource-details');
        if (detailsElement) {
          const isExpanded = detailsElement.style.display !== 'none';
          detailsElement.style.display = isExpanded ? 'none' : 'block';
        }
      }
    });
  }

  // 类型筛选器事件
  const typeFilter = document.getElementById('type-filter');
  const typeFilterTrigger = document.getElementById('type-filter-trigger');

  // 调整容器高度以适应下拉框
  function adjustContainerHeight() {
    // 使用 setTimeout 确保 DOM 更新完成后再计算高度
    setTimeout(() => {
      const dropdownHeight = typeFilter.offsetHeight; // 使用可视高度,而不是完整高度
      const triggerRect = typeFilterTrigger.getBoundingClientRect();
      const resourcesList = document.getElementById('resources-list');

      if (resourcesList) {
        const listRect = resourcesList.getBoundingClientRect();
        const currentListHeight = listRect.height;
        const neededHeight = triggerRect.bottom - listRect.top + dropdownHeight + 10;

        // 取 max(下拉框需要的高度, 当前列表高度)
        resourcesList.style.minHeight = Math.max(neededHeight, currentListHeight) + 'px';
      }
    }, 0);
  }

  // 恢复容器高度
  function resetContainerHeight() {
    const resourcesList = document.getElementById('resources-list');
    if (resourcesList) {
      resourcesList.style.minHeight = '';
    }
  }

  // 点击 Type 列标题时显示/隐藏下拉菜单
  if (typeFilterTrigger && typeFilter) {
    typeFilterTrigger.addEventListener('click', (e) => {
      // 如果点击的是 typeFilter 内部,不处理
      if (typeFilter.contains(e.target)) return;

      e.stopPropagation();

      // 切换下拉菜单显示状态
      if (typeFilter.style.display === 'none' || typeFilter.style.display === '') {
        typeFilter.style.display = 'block';
        adjustContainerHeight();
      } else {
        typeFilter.style.display = 'none';
        resetContainerHeight();
      }
    });

    // 复选框变化时更新筛选状态
    typeFilter.addEventListener('change', (e) => {
      if (e.target.type !== 'checkbox') return;

      const checkboxes = typeFilter.querySelectorAll('input[type="checkbox"]');
      const allCheckbox = typeFilter.querySelector('input[value="all"]');
      const checkedValues = Array.from(checkboxes)
        .filter(cb => cb.checked && cb.value !== 'all')
        .map(cb => cb.value);

      // 处理 "All Types" 的逻辑
      if (e.target.value === 'all') {
        if (e.target.checked) {
          // 选中 "All Types",取消其他所有选项
          checkboxes.forEach(cb => {
            if (cb.value !== 'all') {
              cb.checked = false;
            }
          });
          filterState.types = ['all'];
        } else {
          // 不允许取消 "All Types" 如果没有其他选项被选中
          if (checkedValues.length === 0) {
            e.target.checked = true;
            return;
          }
        }
      } else {
        // 选中具体类型
        if (e.target.checked) {
          // 取消 "All Types"
          if (allCheckbox) {
            allCheckbox.checked = false;
          }
          filterState.types = checkedValues;
        } else {
          // 如果取消后没有任何选项,自动选中 "All Types"
          if (checkedValues.length === 0) {
            if (allCheckbox) {
              allCheckbox.checked = true;
            }
            filterState.types = ['all'];
          } else {
            filterState.types = checkedValues;
          }
        }
      }

      // 更新筛选器激活状态
      if (typeFilterTrigger) {
        if (filterState.types.includes('all')) {
          typeFilterTrigger.classList.remove('active');
        } else {
          typeFilterTrigger.classList.add('active');
        }
      }

      // 重新调整容器高度(因为下拉框高度可能变化)
      adjustContainerHeight();

      // 重新显示资源列表
      if (currentResources) {
        displayResources(currentResources);
      }
    });

    // 点击页面其他地方时隐藏下拉菜单
    document.addEventListener('click', (e) => {
      if (!typeFilterTrigger.contains(e.target)) {
        typeFilter.style.display = 'none';
        resetContainerHeight();
      }
    });
  }

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

// 页面加载完成后初始化 UI
document.addEventListener('DOMContentLoaded', init);
