import { API_CONFIG } from '../config/constants';
import { AgentAccount } from '../scripts/analyze-api';
import { IDataProvider, DataProviderResponse } from './data-provider';
import { Nof1DataProvider } from './nof1-data-provider';

/**
 * API 客户端类
 * 作为数据提供者的适配器,保持向后兼容性
 * 实际的数据获取逻辑由注入的 dataProvider 实现
 */
export class ApiClient {
  private dataProvider: IDataProvider;

  constructor(
    baseUrl: string = API_CONFIG.BASE_URL,
    timeout: number = API_CONFIG.TIMEOUT,
    dataProvider?: IDataProvider
  ) {
    // 如果没有提供 dataProvider,使用默认的 Nof1DataProvider
    this.dataProvider = dataProvider || new Nof1DataProvider(baseUrl, timeout);
  }

  /**
   * 获取账户总数数据
   */
  async getAccountTotals(marker?: number): Promise<DataProviderResponse> {
    return await this.dataProvider.getAccountTotals(marker);
  }

  /**
   * 获取所有可用的 AI Agent 列表
   */
  async getAvailableAgents(): Promise<string[]> {
    return await this.dataProvider.getAvailableAgents();
  }

  /**
   * 获取特定 agent 的数据
   */
  async getAgentData(agentId: string, marker?: number): Promise<AgentAccount | null> {
    return await this.dataProvider.getAgentData(agentId, marker);
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.dataProvider.clearCache();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; entries: Array<{ url: string; age: number }> } {
    return this.dataProvider.getCacheStats();
  }
}

// 为了向后兼容性，导出 Nof1Response 作为 DataProviderResponse 的别名
/**
 * @deprecated 请使用 DataProviderResponse 代替
 */
export type Nof1Response = DataProviderResponse;