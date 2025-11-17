/**
 * 虚拟滚动组件
 * 用于优化长列表的渲染性能
 */
export class VirtualScroller<T> {
  private container: HTMLElement;
  private items: T[];
  private itemHeight: number;
  private visibleCount: number;
  private renderItem: (item: T, index: number) => string;
  private startIndex = 0;
  private endIndex = 0;
  private scrollTop = 0;
  /**
   * @param container 滚动容器
   * @param items 数据项数组
   * @param itemHeight 每项的高度(像素)
   * @param visibleCount 可见项数量
   * @param renderItem 渲染单项的函数
   */
  constructor(
    container: HTMLElement,
    items: T[],
    itemHeight: number,
    visibleCount: number,
    renderItem: (item: T, index: number) => string
  ) {
    this.container = container;
    this.items = items;
    this.itemHeight = itemHeight;
    this.visibleCount = visibleCount;
    this.renderItem = renderItem;
  }

  /**
   * 初始化虚拟滚动
   */
  init(): void {
    this.calculateVisibleRange();
    this.render();
    this.attachScrollListener();
  }

  /**
   * 更新数据
   */
  updateItems(items: T[]): void {
    this.items = items;
    this.calculateVisibleRange();
    this.render();
  }

  /**
   * 计算可见范围
   */
  private calculateVisibleRange(): void {
    const scrollTop = this.container.scrollTop || 0;
    this.startIndex = Math.floor(scrollTop / this.itemHeight);
    this.endIndex = Math.min(
      this.startIndex + this.visibleCount + 2, // 额外渲染2项作为缓冲
      this.items.length
    );
  }

  /**
   * 渲染可见项
   */
  private render(): void {
    const totalHeight = this.items.length * this.itemHeight;
    const offsetY = this.startIndex * this.itemHeight;

    const visibleItems = this.items
      .slice(this.startIndex, this.endIndex)
      .map((item, i) => this.renderItem(item, this.startIndex + i))
      .join("");

    this.container.innerHTML = `
      <div style="height: ${totalHeight}px; position: relative;">
        <div style="transform: translateY(${offsetY}px);">
          ${visibleItems}
        </div>
      </div>
    `;
  }

  /**
   * 附加滚动监听器
   */
  private attachScrollListener(): void {
    let ticking = false;

    this.container.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.calculateVisibleRange();
          this.render();
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  /**
   * 销毁虚拟滚动
   */
  destroy(): void {
    // 移除事件监听器
    this.container.innerHTML = "";
  }
}
