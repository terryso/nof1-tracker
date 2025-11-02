import { TradingPlan } from "../types/trading";
import {
  Position,
  AgentAccount,
  FollowPlan,
  FollowOptions
} from "../types/api";
import { ConfigManager } from "../services/config-manager";
import { ApiClient } from "../services/api-client";
import { PositionManager } from "../services/position-manager";
import { FollowService } from "../services/follow-service";
import { OrderHistoryManager } from "../services/order-history-manager";
import { TradingExecutor } from "../services/trading-executor";
import { BinanceService } from "../services/binance-service";
import { RiskManager } from "../services/risk-manager";
import { FuturesCapitalManager } from "../services/futures-capital-manager";
import {
  LOGGING_CONFIG,
  ENV_VARS
} from "../config/constants";
import {
  handleErrors,
  ConfigurationError
} from "../utils/errors";

// 重新导出类型以保持向后兼容性
export type {
  Position,
  AgentAccount,
  FollowPlan,
  Nof1Response,
  PositionOperationResult,
  EnvironmentConfig,
  FollowOptions
} from "../types/api";

export class ApiAnalyzer {
  private apiClient: ApiClient;
  private positionManager: PositionManager;
  private followService: FollowService;
  private configManager: ConfigManager;
  private binanceService: BinanceService;
  private tradingExecutor: TradingExecutor;
  private orderHistoryManager: OrderHistoryManager;

  constructor(
    baseUrlOrConfigManager?: string | ConfigManager,
    apiClient?: ApiClient
  ) {
    // 支持向后兼容的构造函数签名
    if (typeof baseUrlOrConfigManager === 'string') {
      // 旧的签名：baseUrl 作为字符串
      this.configManager = new ConfigManager();
      this.apiClient = apiClient || new ApiClient(baseUrlOrConfigManager);
    } else {
      // 新的签名：ConfigManager 作为参数
      this.configManager = baseUrlOrConfigManager || new ConfigManager();
      this.apiClient = apiClient || new ApiClient();
    }

    // 验证环境变量
    this.validateEnvironment();

    // 初始化服务
    this.binanceService = new BinanceService(
      process.env[ENV_VARS.BINANCE_API_KEY] || "",
      process.env[ENV_VARS.BINANCE_API_SECRET] || ""
    );
    this.tradingExecutor = new TradingExecutor();
    this.orderHistoryManager = new OrderHistoryManager();
    const riskManager = new RiskManager(this.configManager);
    const capitalManager = new FuturesCapitalManager();

    this.positionManager = new PositionManager(
      this.binanceService,
      this.tradingExecutor,
      this.orderHistoryManager
    );

    this.followService = new FollowService(
      this.positionManager,
      this.orderHistoryManager,
      riskManager,
      capitalManager,
      this.tradingExecutor
    );

    this.apiClient = apiClient || new ApiClient();

    // 加载配置
    this.configManager.loadFromEnvironment();
  }

  /**
   * 验证环境变量
   */
  private validateEnvironment(): void {
    // 在测试环境中跳过环境变量验证
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const requiredEnvVars = [
      ENV_VARS.BINANCE_API_KEY,
      ENV_VARS.BINANCE_API_SECRET
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new ConfigurationError(`Missing required environment variable: ${envVar}`, envVar);
      }
    }
  }

  @handleErrors(Error, 'ApiAnalyzer.analyzeAccountTotals')
  async analyzeAccountTotals(): Promise<TradingPlan[]> {
    const response = await this.apiClient.getAccountTotals();
    console.log(`${LOGGING_CONFIG.EMOJIS.DATA} Received data for ${response.accountTotals.length} model(s)`);

    const tradingPlans: TradingPlan[] = [];

    // Parse each model's positions into trading plans
    for (const account of response.accountTotals) {
      for (const [symbol, position] of Object.entries(account.positions)) {
        if (this.needsAction(position)) {
          const tradingPlan: TradingPlan = {
            id: `${account.model_id}_${symbol}_${account.since_inception_hourly_marker}`,
            symbol: position.symbol,
            side: position.quantity > 0 ? "BUY" : "SELL",
            type: "MARKET",
            quantity: Math.abs(position.quantity),
            leverage: position.leverage,
            timestamp: Date.now()
          };

          tradingPlans.push(tradingPlan);
        }
      }
    }

    console.log(`${LOGGING_CONFIG.EMOJIS.SUCCESS} Generated ${tradingPlans.length} trading plan(s) from API data`);
    return tradingPlans;
  }

  
  /**
   * 跟单特定AI Agent
   */
  @handleErrors(Error, 'ApiAnalyzer.followAgent')
  async followAgent(agentId: string, options?: FollowOptions): Promise<FollowPlan[]> {
    // 获取 agent 数据
    const agentAccount = await this.apiClient.getAgentData(agentId);

    if (!agentAccount) {
      console.log(`${LOGGING_CONFIG.EMOJIS.ERROR} Agent ${agentId} not found`);
      return [];
    }

    const currentPositions = Object.values(agentAccount.positions);

    // 使用 FollowService 处理跟单逻辑
    return await this.followService.followAgent(agentId, currentPositions, options);
  }

  /**
   * 获取所有可用的AI Agent列表
   */
  @handleErrors(Error, 'ApiAnalyzer.getAvailableAgents')
  async getAvailableAgents(): Promise<string[]> {
    return await this.apiClient.getAvailableAgents();
  }

  /**
   * 获取配置管理器
   */
  getConfigManager(): ConfigManager {
    return this.configManager;
  }

  /**
   * 检查仓位是否需要操作
   */
  private needsAction(position: Position): boolean {
    return position.quantity !== 0 &&
           position.current_price > 0 &&
           position.leverage > 0;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.apiClient.clearCache();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): { size: number; entries: Array<{ url: string; age: number }> } {
    return this.apiClient.getCacheStats();
  }

  /**
   * 清除指定 agent 的历史仓位
   */
  clearAgentHistory(agentId: string): void {
    this.followService.clearLastPositions(agentId);
  }

  /**
   * 清除所有 agent 的历史仓位
   */
  clearAllAgentHistory(): void {
    this.followService.clearAllLastPositions();
  }

  /**
   * 获取 agent 数据（公开方法）
   */
  async getAgentData(agentId: string): Promise<AgentAccount | null> {
    return await this.apiClient.getAgentData(agentId);
  }

  /**
   * 获取订单历史管理器
   */
  getOrderHistoryManager(): OrderHistoryManager {
    return this.orderHistoryManager;
  }

  /**
   * 清理资源，关闭所有连接
   */
  destroy(): void {
    if (this.binanceService) {
      this.binanceService.destroy();
    }
    if (this.tradingExecutor) {
      this.tradingExecutor.destroy();
    }
  }
}
