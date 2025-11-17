/**
 * 类型守卫和空值检查工具函数
 */
/**
 * 检查元素是否存在且为 HTMLElement
 * @param element 要检查的元素
 * @returns 类型守卫结果
 */
export function isHTMLElement(element: unknown): element is HTMLElement {
  return element instanceof HTMLElement;
}

/**
 * 安全地查询 DOM 元素
 * @param container 容器元素
 * @param selector CSS 选择器
 * @returns 找到的元素或 null
 */
export function safeQuerySelector<T extends HTMLElement = HTMLElement>(
  container: HTMLElement | Document,
  selector: string
): T | null {
  try {
    const element = container.querySelector(selector);
    return isHTMLElement(element) ? (element as T) : null;
  } catch (error) {
    console.error(`[Guards] 查询选择器失败: ${selector}`, error);
    return null;
  }
}

/**
 * 安全地查询所有匹配的 DOM 元素
 * @param container 容器元素
 * @param selector CSS 选择器
 * @returns 找到的元素数组
 */
export function safeQuerySelectorAll<T extends HTMLElement = HTMLElement>(
  container: HTMLElement | Document,
  selector: string
): T[] {
  try {
    const elements = container.querySelectorAll(selector);
    return Array.from(elements).filter(isHTMLElement) as T[];
  } catch (error) {
    console.error(`[Guards] 查询选择器失败: ${selector}`, error);
    return [];
  }
}

/**
 * 检查值是否为非空
 * @param value 要检查的值
 * @returns 类型守卫结果
 */
export function isNonNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * 检查数组是否非空
 * @param array 要检查的数组
 * @returns 类型守卫结果
 */
export function isNonEmptyArray<T>(
  array: T[] | null | undefined
): array is T[] {
  return Array.isArray(array) && array.length > 0;
}

/**
 * 安全地获取数据属性
 * @param element HTML 元素
 * @param key 数据属性键名
 * @param defaultValue 默认值
 * @returns 数据属性值或默认值
 */
export function safeGetDataAttribute(
  element: HTMLElement,
  key: string,
  defaultValue: string = ""
): string {
  try {
    return element.dataset[key] ?? defaultValue;
  } catch (error) {
    console.error(`[Guards] 获取数据属性失败: ${key}`, error);
    return defaultValue;
  }
}

/**
 * 安全地解析浮点数
 * @param value 要解析的值
 * @param defaultValue 默认值
 * @returns 解析后的数字或默认值
 */
export function safeParseFloat(
  value: string | undefined,
  defaultValue: number = 0
): number {
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}
