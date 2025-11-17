import { i18n } from "#i18n";
/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的大小字符串
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return i18n.t("common.cached");
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * 从 URL 中提取文件名
 * @param url 完整的 URL
 * @returns 文件名或主机名
 */
export function getFileName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop() || pathname;
    return filename || urlObj.hostname;
  } catch {
    return url.split("/").pop() || url;
  }
}

/**
 * 格式化时间戳为本地化字符串
 * @param timestamp 时间戳(毫秒)
 * @returns 格式化后的时间字符串
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}

/**
 * 格式化持续时间
 * @param ms 毫秒数
 * @returns 格式化后的持续时间字符串
 */
export function formatDuration(ms: number): string {
  return `${ms.toFixed(2)}ms`;
}
