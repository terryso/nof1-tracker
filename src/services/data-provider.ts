/**
 * 数据提供者抽象层
 * 用于隔离具体的数据源实现(如 nof1 API),方便未来切换到其他数据源
 */

import { AgentAccount } from '../types/api';

/**
 * 数据提供者响应接口
 * 统一的数据响应格式,不依赖具体的 API 实现
 */
export interface DataProviderResponse {
  /** Agent 账户列表 */
  accountTotals: AgentAccount[];
}

/**
 * 数据提供者接口
 * 定义获取交易信号数据的标准方法
 */
export interface IDataProvider {
  /**
   * 获取账户总览数据
   * @param marker 可选的时间标记,用于获取特定时间点的数据
   * @returns 包含所有 agent 账户信息的响应
   */
  getAccountTotals(marker?: number): Promise<DataProviderResponse>;

  /**
   * 获取所有可用的 AI Agent 列表
   * @returns Agent ID 列表
   */
  getAvailableAgents(): Promise<string[]>;

  /**
   * 获取特定 agent 的数据
   * @param agentId Agent 的唯一标识符
   * @param marker 可选的时间标记
   * @returns Agent 账户信息,如果不存在则返回 null
   */
  getAgentData(agentId: string, marker?: number): Promise<AgentAccount | null>;

  /**
   * 清除缓存
   */
  clearCache(): void;

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; entries: Array<{ url: string; age: number }> };
}
