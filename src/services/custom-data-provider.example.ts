/**
 * 自定义数据提供者示例
 * 当 nof1 API 停用时,可以参考此文件创建新的数据提供者
 */

import { AgentAccount } from '../types/api';
import { IDataProvider, DataProviderResponse } from './data-provider';

/**
 * 自定义数据提供者示例
 * 
 * 使用方法:
 * 1. 复制此文件并重命名(例如: my-custom-data-provider.ts)
 * 2. 实现 IDataProvider 接口的所有方法
 * 3. 在 ApiClient 构造函数中注入你的实现:
 *    const customProvider = new MyCustomDataProvider();
 *    const apiClient = new ApiClient(undefined, undefined, customProvider);
 */
export class CustomDataProviderExample implements IDataProvider {
  private cache: Map<string, any> = new Map();

  constructor(
    private apiEndpoint: string,
    private apiKey?: string
  ) {
    // 初始化你的 API 客户端
  }

  /**
   * 获取账户总览数据
   * 从你的新 API 获取数据,并转换为标准格式
   */
  async getAccountTotals(marker?: number): Promise<DataProviderResponse> {
    // TODO: 实现你的 API 调用逻辑
    // 示例:
    // const response = await fetch(`${this.apiEndpoint}/accounts?marker=${marker}`);
    // const data = await response.json();
    
    // 转换为标准格式
    const accountTotals: AgentAccount[] = [
      // 将你的 API 返回的数据转换为 AgentAccount 格式
      // {
      //   id: 'agent-1',
      //   model_id: 'your-agent-id',
      //   since_inception_hourly_marker: marker || Date.now(),
      //   positions: {
      //     'BTC': {
      //       symbol: 'BTC',
      //       entry_price: 50000,
      //       quantity: 0.1,
      //       leverage: 1,
      //       current_price: 51000,
      //       unrealized_pnl: 100,
      //       confidence: 0.8,
      //       entry_oid: 12345,
      //       tp_oid: 0,
      //       sl_oid: 0,
      //       margin: 5000,
      //       exit_plan: {
      //         profit_target: 52000,
      //         stop_loss: 48000,
      //         invalidation_condition: 'Price below 48000'
      //       }
      //     }
      //   }
      // }
    ];

    return { accountTotals };
  }

  /**
   * 获取所有可用的 AI Agent 列表
   */
  async getAvailableAgents(): Promise<string[]> {
    const response = await this.getAccountTotals();
    
    // 提取唯一的 agent ID
    const agentIds = new Set<string>();
    for (const account of response.accountTotals) {
      agentIds.add(account.model_id);
    }
    
    return Array.from(agentIds);
  }

  /**
   * 获取特定 agent 的数据
   */
  async getAgentData(agentId: string, marker?: number): Promise<AgentAccount | null> {
    const response = await this.getAccountTotals(marker);
    
    // 查找指定的 agent
    const agent = response.accountTotals.find(
      account => account.model_id === agentId
    );
    
    return agent || null;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; entries: Array<{ url: string; age: number }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([url, entry]) => ({
      url,
      age: now - (entry.timestamp || 0)
    }));

    return {
      size: this.cache.size,
      entries
    };
  }
}

/**
 * 使用示例:
 * 
 * // 1. 创建自定义数据提供者实例
 * const customProvider = new CustomDataProviderExample(
 *   'https://your-api.com',
 *   'your-api-key'
 * );
 * 
 * // 2. 注入到 ApiClient
 * const apiClient = new ApiClient(
 *   undefined,  // baseUrl (不使用)
 *   undefined,  // timeout (不使用)
 *   customProvider  // 使用自定义提供者
 * );
 * 
 * // 3. 正常使用,无需修改其他代码
 * const agents = await apiClient.getAvailableAgents();
 * const agentData = await apiClient.getAgentData('your-agent-id');
 */
