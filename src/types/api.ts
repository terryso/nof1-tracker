/**
 * API 相关类型定义
 */

import { PriceToleranceCheck } from '../services/risk-manager';
import { CapitalAllocationResult } from '../services/futures-capital-manager';

/**
 * 仓位信息
 */
export interface Position {
  symbol: string;
  entry_price: number;
  quantity: number;
  leverage: number;
  current_price: number;
  unrealized_pnl: number;
  confidence: number;
  entry_oid: number;
  tp_oid: number;
  sl_oid: number;
  margin: number; // 初始保证金
  exit_plan: {
    profit_target: number;
    stop_loss: number;
    invalidation_condition: string;
  };
}

/**
 * AI Agent 账户信息
 */
export interface AgentAccount {
  id: string;
  model_id: string;
  since_inception_hourly_marker: number;
  positions: Record<string, Position>;
}

/**
 * 跟单计划
 */
export interface FollowPlan {
  action: "ENTER" | "EXIT" | "HOLD";
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  quantity: number;
  leverage: number;
  entryPrice?: number;
  exitPrice?: number;
  reason: string;
  agent: string;
  timestamp: number;
  position?: Position; // 添加position信息以支持止盈止损设置
  priceTolerance?: PriceToleranceCheck; // 价格容忍度检查结果
  // 资金分配相关字段
  originalMargin?: number; // Agent原始保证金
  allocatedMargin?: number; // 分配的保证金
  notionalValue?: number; // 名义持仓价值
  adjustedQuantity?: number; // 调整后的数量
  allocationRatio?: number; // 分配比例
  releasedMargin?: number; // 平仓释放的资金(用于换仓时复用)
  marginType?: 'ISOLATED' | 'CROSSED'; // 保证金模式: ISOLATED(逐仓) 或 CROSSED(全仓), 默认全仓
}

/**
 * API 响应的基础接口
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

/**
 * NOF1 API 响应
 * @deprecated 请使用 DataProviderResponse 代替
 */
export interface Nof1Response {
  accountTotals: AgentAccount[];
}

/**
 * 数据提供者响应接口
 * 统一的数据响应格式,不依赖具体的 API 实现
 */
export interface DataProviderResponse {
  accountTotals: AgentAccount[];
}

/**
 * 仓位操作结果
 */
export interface PositionOperationResult {
  success: boolean;
  orderId?: number;
  error?: string;
  symbol: string;
  operation: 'open' | 'close';
}

/**
 * 仓位验证结果
 */
export interface PositionValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

/**
 * 仓位变化检测结果
 */
export interface PositionChange {
  symbol: string;
  type: 'entry_changed' | 'new_position' | 'position_closed' | 'no_change';
  currentPosition?: Position;
  previousPosition?: Position;
}

/**
 * 缓存条目
 */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  url: string;
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
  API_ERROR = 'ApiError',
  TRADING_ERROR = 'TradingError',
  POSITION_ERROR = 'PositionError',
  CONFIGURATION_ERROR = 'ConfigurationError',
  VALIDATION_ERROR = 'ValidationError'
}

/**
 * 日志级别
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

/**
 * 环境配置
 */
export interface EnvironmentConfig {
  binanceApiKey: string;
  binanceApiSecret: string;
  nof1ApiBaseUrl?: string;
  environment: 'development' | 'production' | 'test';
}

/**
 * 跟单配置选项
 */
export interface FollowOptions {
  profitTarget?: number;        // 盈利目标百分比 (e.g., 30 for 30%)
  autoRefollow?: boolean;       // 自动重新跟单 (默认false)
  totalMargin?: number;         // 总保证金（比例分配模式）
  fixedAmountPerCoin?: number;  // 每个币种的固定保证金（固定金额分配模式）
  marginType?: 'ISOLATED' | 'CROSSED'; // 保证金模式: ISOLATED(逐仓) 或 CROSSED(全仓), 默认全仓
}

/**
 * 应用配置
 */
export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
  };
  trading: {
    defaultLeverage: number;
    minPositionSize: number;
  };
  cache: {
    ttl: number;
    maxSize: number;
  };
  logging: {
    level: LogLevel;
    enableColors: boolean;
  };
}