import "./style.css";
import { getStorageService } from "../../services/storage.service";
import type { PerformanceTiming } from "../../utils/types";
import { i18n } from "#i18n";
import { browser } from "wxt/browser";
import {
  safeQuerySelector,
  safeQuerySelectorAll,
  safeGetDataAttribute,
} from "../../utils/guards";
import { NavigationRenderer } from "./NavigationRenderer";
import {
  ResourcesRenderer,
  type SortState,
  type FilterState,
} from "./ResourcesRenderer";

class PopupApp {
  private timing: PerformanceTiming | null = null;
  private activeTab: "navigation" | "resources" = "navigation";
  private container: HTMLElement;
  private sortState: SortState = {
    column: "none",
    order: "none",
  };
  private filterState: FilterState = {
    types: ["all"],
  };
  private currentTabId: number | null = null;
  private dataTimestamp: number | null = null;
  private abortController: AbortController | null = null;
  private navigationRenderer: NavigationRenderer;
  private resourcesRenderer: ResourcesRenderer;
  private isInitialRender = true; // 标记是否首次渲染

  constructor(container: HTMLElement) {
    this.container = container;
    this.navigationRenderer = new NavigationRenderer();
    this.resourcesRenderer = new ResourcesRenderer(
      this.sortState,
      this.filterState
    );
    this.init();
  }

  async init() {
    try {
      const hasNewData = await this.loadData();
      // 只在有新数据或首次加载时渲染
      if (hasNewData || !this.isRendered()) {
        console.debug(`[Popup] 🎉 首次加载或有新数据, 渲染中...`);
        this.render();
        this.attachEventListeners();
        this.isInitialRender = false;
        console.debug(`[Popup] 🎉 渲染完成`);
      }
    } catch (error) {
      console.error("[Popup] ❌ 初始化失败:", error);
      this.renderError("Failed to initialize popup");
    }
  }

  /**
   * 加载数据,返回是否有新数据
   */
  async loadData(): Promise<boolean> {
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tabs[0]?.id) {
        console.warn("[Popup] ⚠️ 无法获取当前标签页 ID");
        return false;
      }

      const tabId = tabs[0].id;
      const storage = getStorageService();
      const data = await storage.getPerformanceData(tabId);

      // 如果是同一个 tab 且数据时间戳相同,不需要重新加载
      if (
        this.currentTabId === tabId &&
        data?.timestamp === this.dataTimestamp &&
        this.timing !== null
      ) {
        console.debug(`[Popup] 📦 使用缓存数据: Tab ${tabId}`);
        return false;
      }

      // 更新数据
      if (data) {
        this.timing = data.timing;
        this.currentTabId = tabId;
        this.dataTimestamp = data.timestamp;
        console.debug(
          `[Popup] 🔄 加载新数据: Tab ${tabId}, timestamp: ${data.timestamp}`
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error("[Popup] ❌ 加载数据失败:", error);
      return false;
    }
  }

  /**
   * 检查是否已经渲染过
   */
  private isRendered(): boolean {
    return this.container.querySelector(".popup-container") !== null;
  }

  /**
   * 渲染错误信息
   */
  private renderError(message: string) {
    this.container.innerHTML = `
      <div class="error-container">
        <p class="error-message">❌ ${message}</p>
      </div>
    `;
  }

  /**
   * 完整渲染（首次加载或数据变化时）
   */
  render() {
    if (!this.timing) {
      this.container.innerHTML = `<p class="no-data">${i18n.t(
        "common.noData"
      )}</p>`;
      return;
    }

    this.container.innerHTML = `
      <div class="popup-container">
        <div class="tabs">
          <button class="tab-button ${
            this.activeTab === "navigation" ? "active" : ""
          }" data-tab="navigation">
            ${i18n.t("navigation.title")}
          </button>
          <button class="tab-button ${
            this.activeTab === "resources" ? "active" : ""
          }" data-tab="resources">
            ${i18n.t("resources.title")} (${this.timing.resources?.length || 0})
          </button>
        </div>

        <div id="navigation-tab" class="tab-content ${
          this.activeTab === "navigation" ? "active" : ""
        }">
          ${this.navigationRenderer.render(this.timing)}
        </div>

        <div id="resources-tab" class="tab-content ${
          this.activeTab === "resources" ? "active" : ""
        }">
          ${this.resourcesRenderer.render(this.timing)}
        </div>

        <div class="actions">
          <button id="export-btn" class="btn-export">${i18n.t(
            "actions.export"
          )}</button>
        </div>
      </div>
    `;
  }

  /**
   * 🆕 增量更新资源列表（仅重新排序/筛选，不重新创建 DOM）
   */
  private updateResourcesList() {
    if (!this.timing) return;

    const resourcesList = safeQuerySelector(this.container, ".resources-list");
    if (!resourcesList) {
      // 如果 DOM 不存在，需要完整渲染
      console.debug("[Popup] 📋 资源列表 DOM 不存在，执行完整渲染");
      this.render();
      this.attachEventListeners();
      return;
    }

    console.debug("[Popup] 🔄 增量更新资源列表（DOM 复用）");

    // 获取筛选和排序后的资源
    let resources = [...(this.timing.resources || [])];
    resources = this.resourcesRenderer.applyFilter(resources);
    resources = this.resourcesRenderer.applySort(resources);

    // 创建资源名称到索引的映射
    const resourceMap = new Map(resources.map((r, i) => [r.name, i]));

    // 获取所有现有的 DOM 元素
    const existingItems = Array.from(
      resourcesList.querySelectorAll(".resource-item")
    ) as HTMLElement[];

    // 创建元素映射
    const elementMap = new Map<string, HTMLElement>();
    existingItems.forEach((item) => {
      const name = item.dataset.resourceName;
      if (name) {
        elementMap.set(name, item);
      }
    });

    // 使用 DocumentFragment 批量更新
    const fragment = document.createDocumentFragment();

    resources.forEach((resource) => {
      const existingElement = elementMap.get(resource.name);
      if (existingElement) {
        // 复用现有元素
        existingElement.style.display = "";
        fragment.appendChild(existingElement);
      } else {
        // 创建新元素（理论上不应该发生，除非数据变化）
        console.warn(
          `[Popup] ⚠️ 资源 ${resource.name} 的 DOM 不存在，创建新元素`
        );
        const totalTime =
          this.timing?.resources?.reduce(
            (max, r) => Math.max(max, r.startTime + r.duration),
            0
          ) ?? 0;
        const newElement = this.createResourceElement(resource, totalTime);
        fragment.appendChild(newElement);
      }
    });

    // 一次性更新 DOM
    resourcesList.innerHTML = "";
    resourcesList.appendChild(fragment);

    // 重新应用背景色
    this.resourcesRenderer.applyBackgrounds(this.container);
  }

  /**
   * 🆕 创建单个资源元素（用于增量更新时的新元素）
   */
  private createResourceElement(resource: any, totalTime: number): HTMLElement {
    const div = document.createElement("div");
    div.className = "resource-item";
    div.dataset.resourceName = resource.name;
    div.innerHTML = this.resourcesRenderer.renderResourceItem(
      resource,
      totalTime,
      0
    );
    return div.firstElementChild as HTMLElement;
  }

  /**
   * 🆕 更新排序按钮样式（不重新渲染整个 UI）
   */
  private updateSortButtonStyles() {
    const durationSort = safeQuerySelector(this.container, "#duration-sort");
    const sizeSort = safeQuerySelector(this.container, "#size-sort");

    if (durationSort) {
      durationSort.classList.remove("asc", "desc");
      if (
        this.sortState.column === "duration" &&
        this.sortState.order !== "none"
      ) {
        durationSort.classList.add(this.sortState.order);
      }
    }

    if (sizeSort) {
      sizeSort.classList.remove("asc", "desc");
      if (this.sortState.column === "size" && this.sortState.order !== "none") {
        sizeSort.classList.add(this.sortState.order);
      }
    }
  }

  attachEventListeners() {
    // 清理旧的事件监听器
    if (this.abortController) {
      this.abortController.abort();
    }

    // 创建新的 AbortController
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    // 标签页切换 - 使用事件委托
    const tabsContainer = safeQuerySelector(this.container, ".tabs");
    if (tabsContainer) {
      tabsContainer.addEventListener(
        "click",
        (e: Event) => {
          const target = e.target as HTMLElement;
          if (target.classList.contains("tab-button")) {
            const tab = safeGetDataAttribute(target, "tab");
            if (tab === "navigation" || tab === "resources") {
              this.activeTab = tab;
              this.render();
              this.attachEventListeners();
              // 应用背景色
              if (this.activeTab === "navigation") {
                this.navigationRenderer.applyBackgrounds(this.container);
              } else {
                this.resourcesRenderer.applyBackgrounds(this.container);
              }
            }
          }
        },
        { signal }
      );
    }

    // 导出按钮 - 使用事件委托
    const actionsContainer = safeQuerySelector(this.container, ".actions");
    if (actionsContainer) {
      actionsContainer.addEventListener(
        "click",
        (e: Event) => {
          const target = e.target as HTMLElement;
          if (target.id === "export-btn") {
            this.exportData();
          }
        },
        { signal }
      );
    }

    // Sub Resources 链接点击 - 使用事件委托
    const timingTable = safeQuerySelector(this.container, ".timing-table");
    if (timingTable) {
      timingTable.addEventListener(
        "click",
        (e: Event) => {
          const target = e.target as HTMLElement;
          if (target.id === "domSubResLink") {
            this.activeTab = "resources";
            this.render();
            this.attachEventListeners();
            this.resourcesRenderer.applyBackgrounds(this.container);
          }
        },
        { signal }
      );
    }

    // 资源项点击展开/收起 - 使用事件委托
    const resourcesList = safeQuerySelector(this.container, ".resources-list");
    if (resourcesList) {
      resourcesList.addEventListener(
        "click",
        (e: Event) => {
          const target = e.target as HTMLElement;
          const resourceItem = target.closest(".resource-item");
          if (resourceItem) {
            const details = safeQuerySelector<HTMLElement>(
              resourceItem as HTMLElement,
              ".resource-details"
            );
            if (details) {
              details.style.display =
                details.style.display === "none" ? "block" : "none";
            }
          }
        },
        { signal }
      );
    }

    // 🆕 排序按钮 - 优化版本（不重新渲染整个 UI）
    const resourcesHeader = this.container.querySelector(".resources-header");
    if (resourcesHeader) {
      resourcesHeader.addEventListener(
        "click",
        (e: Event) => {
          const target = e.target as HTMLElement;
          const sortButton = target.closest(".sortable");
          if (sortButton) {
            const sortId = sortButton.id;
            if (sortId === "duration-sort") {
              if (this.sortState.column === "duration") {
                this.sortState.order =
                  this.sortState.order === "asc"
                    ? "desc"
                    : this.sortState.order === "desc"
                    ? "none"
                    : "asc";
                if (this.sortState.order === "none") {
                  this.sortState.column = "none";
                }
              } else {
                this.sortState.column = "duration";
                this.sortState.order = "asc";
              }
            } else if (sortId === "size-sort") {
              if (this.sortState.column === "size") {
                this.sortState.order =
                  this.sortState.order === "asc"
                    ? "desc"
                    : this.sortState.order === "desc"
                    ? "none"
                    : "asc";
                if (this.sortState.order === "none") {
                  this.sortState.column = "none";
                }
              } else {
                this.sortState.column = "size";
                this.sortState.order = "asc";
              }
            }

            // 🆕 只更新排序按钮样式和资源列表，不重新渲染整个 UI
            this.updateSortButtonStyles();
            this.updateResourcesList();
          }
        },
        { signal }
      );
    }

    // 🆕 筛选器 - 优化版本（不重新渲染整个 UI）
    const typeFilterTrigger = this.container.querySelector(
      "#type-filter-trigger"
    );
    const typeFilter = this.container.querySelector("#type-filter");

    if (typeFilterTrigger && typeFilter) {
      // 筛选器触发器点击
      typeFilterTrigger.addEventListener(
        "click",
        (e: Event) => {
          e.stopPropagation();
          const dropdown = typeFilter as HTMLElement;
          if (
            dropdown.style.display === "none" ||
            dropdown.style.display === ""
          ) {
            dropdown.style.display = "block";
            // 计算 fixed 定位的位置
            const rect = typeFilterTrigger.getBoundingClientRect();
            dropdown.style.top = rect.bottom + 4 + "px";
            dropdown.style.right = window.innerWidth - rect.right + "px";
          } else {
            dropdown.style.display = "none";
          }
        },
        { signal }
      );

      // 点击其他地方关闭筛选器
      document.addEventListener(
        "click",
        (e: Event) => {
          if (
            !typeFilterTrigger.contains(e.target as Node) &&
            !typeFilter.contains(e.target as Node)
          ) {
            (typeFilter as HTMLElement).style.display = "none";
          }
        },
        { signal }
      );

      // 筛选器选项变化
      typeFilter.addEventListener(
        "change",
        (e: Event) => {
          const target = e.target as HTMLInputElement;
          if (target.type !== "checkbox") return;

          const allCheckbox = typeFilter.querySelector(
            'input[value="all"]'
          ) as HTMLInputElement;
          const checkboxes = Array.from(
            typeFilter.querySelectorAll('input[type="checkbox"]')
          ) as HTMLInputElement[];

          if (target.value === "all") {
            if (target.checked) {
              checkboxes.forEach((cb) => {
                if (cb.value !== "all") cb.checked = false;
              });
              this.filterState.types = ["all"];
            }
          } else {
            if (target.checked) {
              if (allCheckbox) allCheckbox.checked = false;
            }

            const checkedTypes = checkboxes
              .filter((cb) => cb.checked && cb.value !== "all")
              .map((cb) => cb.value);

            if (checkedTypes.length === 0) {
              if (allCheckbox) allCheckbox.checked = true;
              this.filterState.types = ["all"];
            } else {
              this.filterState.types = checkedTypes;
            }
          }

          // 🆕 只更新资源列表，不重新渲染整个 UI
          this.updateResourcesList();
        },
        { signal }
      );
    }

    // 初始应用背景色
    if (this.activeTab === "navigation") {
      this.navigationRenderer.applyBackgrounds(this.container);
    } else {
      this.resourcesRenderer.applyBackgrounds(this.container);
    }
  }

  exportData() {
    if (!this.timing) return;

    const data = {
      timestamp: new Date(this.timing.startTimestamp).toISOString(),
      url: this.timing.name,
      navigationTiming: this.timing,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `page-timing-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// 初始化应用
const app = document.getElementById("app");
if (app) {
  new PopupApp(app);
}
