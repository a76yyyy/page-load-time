import { i18n } from "#i18n";
import type { PerformanceTiming, ResourceEntry } from "../../utils/types";
import { formatSize, getFileName } from "../../utils/formatters";
import {
  calculateResourceTimeRange,
  calculatePercentage,
} from "../../utils/calculators";
import { isNonEmptyArray } from "../../utils/guards";
/**
 * 排序状态
 */
export interface SortState {
  column: "none" | "duration" | "size";
  order: "none" | "asc" | "desc";
}

/**
 * 筛选状态
 */
export interface FilterState {
  types: string[];
}

/**
 * 资源列表渲染器
 * 负责渲染页面资源加载信息
 */
export class ResourcesRenderer {
  private sortState: SortState;
  private filterState: FilterState;
  private useVirtualScroll: boolean;
  private readonly VIRTUAL_SCROLL_THRESHOLD = 100; // 超过100项启用虚拟滚动

  constructor(
    sortState: SortState,
    filterState: FilterState,
    useVirtualScroll = true
  ) {
    this.sortState = sortState;
    this.filterState = filterState;
    this.useVirtualScroll = useVirtualScroll;
  }

  /**
   * 渲染资源列表
   */
  render(timing: PerformanceTiming): string {
    if (!isNonEmptyArray(timing.resources)) {
      return `<p class="no-data">${i18n.t("resources.noData")}</p>`;
    }

    let resources = [...timing.resources];

    // 应用筛选
    resources = this.applyFilter(resources);

    // 应用排序
    resources = this.applySort(resources);

    // 计算资源时间范围
    const timeRange = calculateResourceTimeRange(timing.resources);
    const totalTime = timeRange.max - timeRange.min;

    // 获取所有资源类型
    const allTypes = this.getAllTypes(timing.resources);

    return `
      <div class="resources-container">
        <h3>${i18n.t("resources.resourceTimings")}</h3>
        ${this.renderHeader(allTypes)}
        ${this.renderResourcesList(resources, totalTime)}
      </div>
    `;
  }

  /**
   * 应用筛选
   */
  public applyFilter(resources: ResourceEntry[]): ResourceEntry[] {
    if (this.filterState.types.includes("all")) {
      return resources;
    }

    return resources.filter((r) =>
      this.filterState.types.includes(r.initiatorType || "unknown")
    );
  }

  /**
   * 应用排序
   */
  public applySort(resources: ResourceEntry[]): ResourceEntry[] {
    if (this.sortState.column === "none" || this.sortState.order === "none") {
      return resources;
    }

    return resources.sort((a, b) => {
      let valueA = 0,
        valueB = 0;

      if (this.sortState.column === "duration") {
        valueA = a.duration;
        valueB = b.duration;
      } else if (this.sortState.column === "size") {
        // cached 资源排在最后
        if (a.transferSize === 0 && b.transferSize !== 0) return 1;
        if (a.transferSize !== 0 && b.transferSize === 0) return -1;
        if (a.transferSize === 0 && b.transferSize === 0) return 0;
        valueA = a.transferSize;
        valueB = b.transferSize;
      }

      return this.sortState.order === "asc" ? valueA - valueB : valueB - valueA;
    });
  }

  /**
   * 获取所有资源类型
   */
  private getAllTypes(resources: ResourceEntry[]): string[] {
    return Array.from(
      new Set(resources.map((r) => r.initiatorType || "unknown"))
    ).sort();
  }

  /**
   * 渲染表头
   */
  private renderHeader(allTypes: string[]): string {
    const filterOptions = this.renderFilterOptions(allTypes);

    return `
      <div class="resources-header">
        <span class="resource-name">${i18n.t("resources.resource")}</span>
        <span class="resource-type filterable" id="type-filter-trigger">
          ${i18n.t("resources.type")}<span class="filter-icon">▼</span>
          <div id="type-filter" class="type-filter-dropdown" style="display: none;">
            ${filterOptions}
          </div>
        </span>
        <span class="resource-duration sortable ${
          this.sortState.column === "duration" ? this.sortState.order : ""
        }" id="duration-sort">
          ${i18n.t("resources.duration")}<span class="sort-icon"></span>
        </span>
        <span class="resource-size sortable ${
          this.sortState.column === "size" ? this.sortState.order : ""
        }" id="size-sort">
          ${i18n.t("resources.size")}<span class="sort-icon"></span>
        </span>
      </div>
    `;
  }

  /**
   * 渲染筛选选项
   */
  private renderFilterOptions(allTypes: string[]): string {
    const allOption = `
      <label class="filter-option">
        <input type="checkbox" value="all" ${
          this.filterState.types.includes("all") ? "checked" : ""
        }>
        <span>All Types</span>
      </label>
    `;

    const typeOptions = allTypes
      .map(
        (type) => `
      <label class="filter-option">
        <input type="checkbox" value="${type}" ${
          this.filterState.types.includes(type) ? "checked" : ""
        }>
        <span>${type.charAt(0).toUpperCase() + type.slice(1)}</span>
      </label>
    `
      )
      .join("");

    return allOption + typeOptions;
  }

  /**
   * 渲染资源列表
   */
  private renderResourcesList(
    resources: ResourceEntry[],
    totalTime: number
  ): string {
    // 判断是否使用虚拟滚动
    const shouldUseVirtualScroll =
      this.useVirtualScroll && resources.length > this.VIRTUAL_SCROLL_THRESHOLD;

    if (shouldUseVirtualScroll) {
      return `
        <div class="resources-list virtual-scroll" data-virtual-scroll="true">
          ${this.renderResourceItems(resources, totalTime)}
        </div>
      `;
    }

    return `
      <div class="resources-list">
        ${this.renderResourceItems(resources, totalTime)}
      </div>
    `;
  }

  /**
   * 渲染资源项
   */
  private renderResourceItems(
    resources: ResourceEntry[],
    totalTime: number
  ): string {
    return resources
      .map((resource, index) =>
        this.renderResourceItem(resource, totalTime, index)
      )
      .join("");
  }

  /**
   * 渲染单个资源项
   */
  renderResourceItem(
    resource: ResourceEntry,
    totalTime: number,
    index: number
  ): string {
    const timeRange = calculateResourceTimeRange([resource]);
    const relativeStart = resource.startTime - timeRange.min;
    const percentage = calculatePercentage(resource.duration, totalTime);
    const startPercentage = calculatePercentage(relativeStart, totalTime);

    return `
      <div class="resource-item" data-percentage="${percentage}" data-start="${startPercentage}" data-index="${index}">
        <div class="resource-main">
          <span class="resource-name" title="${resource.name}">${getFileName(
      resource.name
    )}</span>
          <span class="resource-type">${
            resource.initiatorType || "unknown"
          }</span>
          <span class="resource-duration">${resource.duration.toFixed(
            2
          )}ms</span>
          <span class="resource-size">${formatSize(
            resource.transferSize
          )}</span>
        </div>
        <div class="resource-details" style="display: none;">
          ${this.renderResourceDetails(resource)}
        </div>
      </div>
    `;
  }

  /**
   * 渲染资源详情
   */
  private renderResourceDetails(resource: ResourceEntry): string {
    return `
      <div class="detail-row">
        <span class="detail-label">${i18n.t("resources.url")}:</span>
        <span class="detail-value">${resource.name}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${i18n.t("resources.type")}:</span>
        <span class="detail-value">${resource.initiatorType || "unknown"}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${i18n.t("resources.duration")}:</span>
        <span class="detail-value">${resource.duration.toFixed(2)}ms</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${i18n.t("resources.startTime")}:</span>
        <span class="detail-value">${resource.startTime.toFixed(2)}ms</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${i18n.t("resources.transferSize")}:</span>
        <span class="detail-value">${
          resource.transferSize > 0
            ? resource.transferSize + " bytes"
            : i18n.t("common.cached")
        }</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${i18n.t("resources.encodedSize")}:</span>
        <span class="detail-value">${resource.encodedBodySize} bytes</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${i18n.t("resources.decodedSize")}:</span>
        <span class="detail-value">${resource.decodedBodySize} bytes</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${i18n.t("resources.protocol")}:</span>
        <span class="detail-value">${
          resource.nextHopProtocol || "unknown"
        }</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${i18n.t("resources.status")}:</span>
        <span class="detail-value">${
          resource.responseStatus || "unknown"
        }</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">${i18n.t("resources.remoteIP")}:</span>
        <span class="detail-value">${
          resource.remoteIPAddress || "unknown"
        }</span>
      </div>
    `;
  }

  /**
   * 应用资源背景色
   */
  applyBackgrounds(container: HTMLElement): void {
    requestAnimationFrame(() => {
      const resourcesList = container.querySelector(".resources-list");
      if (!resourcesList) return;

      const containerWidth = resourcesList.clientWidth;
      const items = resourcesList.querySelectorAll(
        ".resource-item[data-percentage]"
      );

      items.forEach((item) => {
        const percentage = parseFloat(
          (item as HTMLElement).dataset.percentage || "0"
        );
        const startPercentage = parseFloat(
          (item as HTMLElement).dataset.start || "0"
        );
        const width = Math.max(1, (percentage / 100) * containerWidth);
        const position = (startPercentage / 100) * containerWidth;

        // 只在 resource-main 上应用背景
        const resourceMain = item.querySelector(
          ".resource-main"
        ) as HTMLElement;
        if (resourceMain) {
          resourceMain.style.backgroundImage =
            "linear-gradient(to top, #c3e0ee, #c3e0ee)";
          resourceMain.style.backgroundRepeat = "no-repeat";
          resourceMain.style.backgroundSize = `${width}px 100%`;
          resourceMain.style.backgroundPositionX = `${Math.min(
            position,
            containerWidth - 1
          )}px`;
        }
      });
    });
  }
}
