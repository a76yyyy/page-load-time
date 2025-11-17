import { defineExtensionMessaging } from "@webext-core/messaging";
import type { PerformanceTiming } from "./types";

/**
 * 定义消息协议类型
 * 这定义了所有可能的消息类型及其数据和返回值
 *
 * 函数语法: (data: DataType) => ReturnType
 * - 如果没有数据,使用 () => ReturnType
 * - 如果没有返回值,使用 () => void 或 (data: DataType) => void
 */
interface MessageProtocol {
  // 开始监听请求 - 无数据,无返回值
  startListening: () => void;

  // 停止监听请求 - 无数据,无返回值
  stopListening: () => void;

  // 获取 IP 数据请求 - 无数据,返回 IP 缓存
  getIPData: () => Record<string, string>;

  // 保存性能数据请求 - 发送时间和性能数据,返回成功状态
  savePerformanceData: (data: { time: string; timing: PerformanceTiming }) => {
    success: boolean;
    error?: string;
  };
}

/**
 * 创建类型安全的消息传递系统
 * 这完全避免了消息格式冲突,因为所有消息都遵循 @webext-core/messaging 的协议
 */
export const { sendMessage, onMessage } =
  defineExtensionMessaging<MessageProtocol>();
