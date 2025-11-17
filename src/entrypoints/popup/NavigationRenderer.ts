import { i18n } from "#i18n";
import type { PerformanceTiming } from "../../utils/types";
import { formatTimestamp } from "../../utils/formatters";
import { calculatePercentage } from "../../utils/calculators";
/**
 * 导航时序渲染器
 * 负责渲染页面加载的导航时序信息
 */
export class NavigationRenderer {
  /**
   * 渲染导航时序
   * @param timing 性能时序数据
   * @returns HTML 字符串
   */
  render(timing: PerformanceTiming): string {
    const total = timing.duration;
    const formattedTime = formatTimestamp(timing.startTimestamp);

    return `
      <div class="navigation-timing">
        <h3>${i18n.t("navigation.loadTimings")}</h3>
        <div class="timing-start-time">${formattedTime}</div>

        <div class="timing-table">
          ${this.renderHeader()}
          ${this.renderTimingRows(timing, total)}
          ${this.renderSummary(timing, total)}
        </div>

        <div class="timing-footer">
          ${i18n.t(
            "navigation.timingsBasedOn"
          )} <a href="https://w3c.github.io/navigation-timing/" target="_blank" rel="noopener noreferrer">Navigation Timing Level 2 Spec</a>
        </div>
      </div>
    `;
  }

  /**
   * 渲染表头
   */
  private renderHeader(): string {
    return `
      <div class="timing-header">
        <span>${i18n.t("navigation.event")}</span>
        <span>${i18n.t("navigation.start")}</span>
        <span>${i18n.t("navigation.duration")}</span>
        <span>${i18n.t("navigation.end")}</span>
      </div>
    `;
  }

  /**
   * 渲染所有时序行
   */
  private renderTimingRows(timing: PerformanceTiming, total: number): string {
    const t = timing;

    return `
      ${this.renderRow(
        "redirect",
        i18n.t("navigation.redirect"),
        t.redirectStart,
        t.redirectEnd,
        total
      )}
      ${this.renderRow(
        "dns",
        i18n.t("navigation.dns"),
        t.domainLookupStart,
        t.domainLookupEnd,
        total
      )}
      ${this.renderRow(
        "connect",
        i18n.t("navigation.connect"),
        t.connectStart,
        t.connectEnd,
        total
      )}
      ${this.renderRow(
        "request",
        i18n.t("navigation.request"),
        t.requestStart,
        t.responseStart,
        total
      )}
      ${this.renderRow(
        "response",
        i18n.t("navigation.response"),
        t.responseStart,
        t.responseEnd,
        total
      )}
      ${this.renderRow(
        "dom",
        i18n.t("navigation.dom"),
        t.responseEnd,
        t.domComplete,
        total
      )}
      ${this.renderRow(
        "domParse",
        i18n.t("navigation.parse"),
        t.responseEnd,
        t.domInteractive,
        total,
        true
      )}
      ${this.renderRow(
        "domScripts",
        i18n.t("navigation.executeScripts"),
        t.domInteractive,
        t.domContentLoadedEventStart,
        total,
        true
      )}
      ${this.renderRow(
        "contentLoaded",
        i18n.t("navigation.contentLoaded"),
        t.domContentLoadedEventStart,
        t.domContentLoadedEventEnd,
        total,
        true
      )}
      ${this.renderRow(
        "domSubRes",
        i18n.t("navigation.subResources"),
        t.domContentLoadedEventEnd,
        t.domComplete,
        total,
        true,
        true
      )}
      ${this.renderRow(
        "load",
        i18n.t("navigation.loadEvent"),
        t.loadEventStart,
        t.loadEventEnd,
        total
      )}
    `;
  }

  /**
   * 渲染单行时序数据
   */
  private renderRow(
    id: string,
    label: string,
    start: number,
    end: number,
    total: number,
    isSubItem = false,
    isClickable = false
  ): string {
    const duration = end - start;
    const percentage = calculatePercentage(duration, total);
    const startPercentage = calculatePercentage(start, total);

    return `
      <div class="timing-row" id="r-${id}" data-percentage="${percentage}" data-start="${startPercentage}">
        <span class="timing-label ${isSubItem ? "sub" : ""} ${
      isClickable ? "clickable" : ""
    }" ${isClickable ? `id="${id}Link"` : ""}>${label}</span>
        <span class="timing-start">${start.toFixed(2)}</span>
        <span class="timing-duration">${duration.toFixed(2)}</span>
        <span class="timing-end">${end.toFixed(2)}</span>
      </div>
    `;
  }

  /**
   * 渲染汇总信息
   */
  private renderSummary(timing: PerformanceTiming, total: number): string {
    return `
      <div class="timing-row total" id="r-total">
        <span class="timing-label">${i18n.t("navigation.total")}</span>
        <span class="timing-value" colspan="3">${total.toFixed(2)}</span>
      </div>

      <div class="timing-row remote-ip" id="r-remote-ip">
        <span class="timing-label">${i18n.t("navigation.remoteIP")}</span>
        <span class="timing-value" colspan="3">${
          timing.remoteIPAddress || "unknown"
        }</span>
      </div>
    `;
  }

  /**
   * 应用时序背景色
   * @param container 容器元素
   */
  applyBackgrounds(container: HTMLElement): void {
    requestAnimationFrame(() => {
      const timingTable = container.querySelector(".timing-table");
      if (!timingTable) return;

      const containerWidth = timingTable.clientWidth;
      const rows = timingTable.querySelectorAll(".timing-row[data-percentage]");

      rows.forEach((row) => {
        const percentage = parseFloat(
          (row as HTMLElement).dataset.percentage || "0"
        );
        const startPercentage = parseFloat(
          (row as HTMLElement).dataset.start || "0"
        );
        const width = Math.max(1, (percentage / 100) * containerWidth);
        const position = (startPercentage / 100) * containerWidth;

        (row as HTMLElement).style.backgroundImage =
          "linear-gradient(to top, #c3e0ee, #c3e0ee)";
        (row as HTMLElement).style.backgroundRepeat = "no-repeat";
        (row as HTMLElement).style.backgroundSize = `${width}px 100%`;
        (row as HTMLElement).style.backgroundPositionX = `${Math.min(
          position,
          containerWidth - 1
        )}px`;
      });
    });
  }
}
