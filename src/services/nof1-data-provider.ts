/**
 * Nof1 数据提供者实现
 * 封装 nof1 API 的具体调用逻辑
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  API_CONFIG,
  LOGGING_CONFIG,
  buildAccountTotalsUrl
} from '../config/constants';
import { ApiError, handleErrors, retryWithBackoff } from '../utils/errors';
import { AgentAccount } from '../types/api';
import { IDataProvider, DataProviderResponse } from './data-provider';

/**
 * API 缓存条目
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  url: string;
}

/**
 * Nof1 API 的具体实现
 * 如果 nof1 接口停用,可以创建新的实现类替换此类
 */
export class Nof1DataProvider implements IDataProvider {
  private axiosInstance: AxiosInstance;
  private cache: Map<string, CacheEntry<any>> = new Map();

  constructor(
    private baseUrl: string = API_CONFIG.BASE_URL,
    private timeout: number = API_CONFIG.TIMEOUT
  ) {
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'nof1-maker/1.0.0'
      }
    });

    // 在非测试环境中添加拦截器
    if (process.env.NODE_ENV !== 'test') {
      // 添加请求拦截器
      this.axiosInstance.interceptors.request.use(
        (config) => {
          console.log(`${LOGGING_CONFIG.EMOJIS.API} Calling API: ${config.url}`);
          return config;
        },
        (error) => {
          console.error(`${LOGGING_CONFIG.EMOJIS.ERROR} Request error: ${error.message}`);
          return Promise.reject(error);
        }
      );

      // 添加响应拦截器
      this.axiosInstance.interceptors.response.use(
        (response: AxiosResponse) => {
          const dataSize = JSON.stringify(response.data).length;
          console.log(`${LOGGING_CONFIG.EMOJIS.DATA} Received ${dataSize} bytes of data`);
          return response;
        },
        (error) => {
          const message = error.response?.data?.message || error.message || 'Unknown API error';
          const statusCode = error.response?.status;
          console.error(`${LOGGING_CONFIG.EMOJIS.ERROR} API error (${statusCode}): ${message}`);
          return Promise.reject(error);
        }
      );
    }
  }

  /**
   * 获取账户总数数据
   */
  @handleErrors(ApiError, 'Nof1DataProvider.getAccountTotals')
  async getAccountTotals(marker?: number): Promise<DataProviderResponse> {
    const url = buildAccountTotalsUrl(marker);

    // 检查缓存
    const cached = this.getFromCache<DataProviderResponse>(url);
    if (cached) {
      console.log(`${LOGGING_CONFIG.EMOJIS.INFO} Using cached data for ${url}`);
      return cached;
    }

    return retryWithBackoff(
      () => this.fetchWithCache(url),
      3,
      1000,
      'getAccountTotals'
    );
  }

  /**
   * 获取所有可用的 AI Agent 列表
   */
  @handleErrors(ApiError, 'Nof1DataProvider.getAvailableAgents')
  async getAvailableAgents(): Promise<string[]> {
    const response = await this.getAccountTotals();

    // 过滤出每个 agent 的最新数据
    const latestAccounts = this.getLatestAgentData(response.accountTotals);
    const agents = latestAccounts.map(account => account.model_id);

    console.log(`${LOGGING_CONFIG.EMOJIS.ROBOT} Available agents: ${agents.join(', ')}`);
    return agents;
  }

  /**
   * 获取特定 agent 的数据
   */
  @handleErrors(ApiError, 'Nof1DataProvider.getAgentData')
  async getAgentData(agentId: string, marker?: number): Promise<AgentAccount | null> {
    const response = await this.getAccountTotals(marker);
    const latestAccounts = this.getLatestAgentData(response.accountTotals);

    const agentAccount = latestAccounts.find(account => account.model_id === agentId);

    if (!agentAccount) {
      console.log(`${LOGGING_CONFIG.EMOJIS.ERROR} Agent ${agentId} not found`);
      return null;
    }

    console.log(`${LOGGING_CONFIG.EMOJIS.TARGET} Found agent ${agentId} (marker: ${agentAccount.since_inception_hourly_marker}) with ${Object.keys(agentAccount.positions).length} positions`);
    return agentAccount;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
    console.log(`${LOGGING_CONFIG.EMOJIS.INFO} API cache cleared`);
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; entries: Array<{ url: string; age: number }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([url, entry]) => ({
      url,
      age: now - entry.timestamp
    }));

    return {
      size: this.cache.size,
      entries
    };
  }

  /**
   * 私有方法：带缓存的获取数据
   */
  private async fetchWithCache<T>(url: string): Promise<T> {
    const response = await this.axiosInstance.get<DataProviderResponse>(url);
    this.setCache(url, response.data);
    return response.data as T;
  }

  /**
   * 私有方法：从缓存获取数据
   */
  private getFromCache<T>(url: string): T | null {
    const entry = this.cache.get(url);
    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > API_CONFIG.TIMEOUT) {
      this.cache.delete(url);
      return null;
    }

    return entry.data;
  }

  /**
   * 私有方法：设置缓存
   */
  private setCache<T>(url: string, data: T): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= 100) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(url, {
      data,
      timestamp: Date.now(),
      url
    });
  }

  /**
   * 私有方法：过滤重复数据，只保留每个 agent 的最新记录
   */
  private getLatestAgentData(accountTotals: AgentAccount[]): AgentAccount[] {
    const agentMap = new Map<string, AgentAccount>();

    for (const account of accountTotals) {
      const existing = agentMap.get(account.model_id);

      if (!existing || account.since_inception_hourly_marker > existing.since_inception_hourly_marker) {
        agentMap.set(account.model_id, account);
      }
    }

    return Array.from(agentMap.values());
  }
}
