export interface TradingConfig {
  defaultPriceTolerance: number;
  symbolTolerances: Record<string, number>;
  telegram: {
    enabled: boolean;
    token: string;
    chatId: string;
  }
  slack: {
    enabled: boolean;
    token: string;
    channel: string;
  }
}

export class ConfigManager {
  private config: TradingConfig;

  constructor() {
    this.config = {
      defaultPriceTolerance: 1.0, // Default 1.0%
      symbolTolerances: {},
      telegram: {
        enabled: false,
        token: "",
        chatId: "",
      },
      slack: {
        enabled: false,
        token: "",
        channel: "",
      }
    };
  }

  /**
   * 获取价格容忍度
   */
  getPriceTolerance(symbol?: string): number {
    if (symbol && this.config.symbolTolerances[symbol]) {
      return this.config.symbolTolerances[symbol];
    }
    return this.config.defaultPriceTolerance;
  }

  /**
   * 设置默认价格容忍度
   */
  setPriceTolerance(tolerance: number): void {
    if (tolerance <= 0) {
      throw new Error('Price tolerance must be positive');
    }
    this.config.defaultPriceTolerance = tolerance;
  }

  /**
   * 设置特定币种的价格容忍度
   */
  setSymbolTolerance(symbol: string, tolerance: number): void {
    if (tolerance <= 0) {
      throw new Error('Price tolerance must be positive');
    }
    this.config.symbolTolerances[symbol] = tolerance;
  }

  setTelegramConfig(enabled: boolean, token: string, chatId: string): void {
    this.config.telegram = {
      enabled,
      token,
      chatId,
    };
  }

  setSlackConfig(enabled: boolean, token: string, channel: string): void {
    this.config.slack = {
      enabled,
      token,
      channel,
    };
  }

  /**
   * 从环境变量加载配置
   */
  loadFromEnvironment(): void {
    // Load default price tolerance
    const defaultTolerance = process.env.PRICE_TOLERANCE;
    if (defaultTolerance) {
      const tolerance = parseFloat(defaultTolerance);
      if (!isNaN(tolerance) && tolerance > 0) {
        this.config.defaultPriceTolerance = tolerance;
      }
    }

    // Load symbol-specific tolerances
    // Format: BTCUSDT_TOLERANCE=1.0, ETHUSDT_TOLERANCE=0.3
    Object.keys(process.env).forEach(key => {
      if (key.endsWith('_TOLERANCE')) {
        const symbol = key.replace('_TOLERANCE', '');
        const tolerance = parseFloat(process.env[key] || '');
        if (!isNaN(tolerance) && tolerance > 0) {
          this.config.symbolTolerances[symbol] = tolerance;
        }
      }
    });

    // Load Telegram configuration
    const telegramEnabled = process.env.TELEGRAM_ENABLED === 'true';
    const telegramToken = process.env.TELEGRAM_API_TOKEN || '';
    const telegramChatId = process.env.TELEGRAM_CHAT_ID || '';
    if (telegramEnabled && telegramToken && telegramChatId) {
      this.setTelegramConfig(telegramEnabled, telegramToken, telegramChatId);
    }

    const slackEnabled = process.env.SLACK_ENABLED === 'true';
    const slackToken = process.env.SLACK_OAUTH_TOKEN || '';
    const slackChannel = process.env.SLACK_CHANNEL_NAME || '';
    
    if (slackEnabled && slackToken && slackChannel) {
      this.setSlackConfig(slackEnabled, slackToken, slackChannel);
    }

  }

  /**
   * 导出配置
   */
  exportConfig(): TradingConfig {
    return {
      ...this.config,
      symbolTolerances: { ...this.config.symbolTolerances },
      telegram: { ...this.config.telegram },
      slack: { ...this.config.slack }
    };
  }

  /**
   * 导入配置
   */
  importConfig(config: Partial<TradingConfig>): void {
    if (config.defaultPriceTolerance !== undefined) {
      this.setPriceTolerance(config.defaultPriceTolerance);
    }

    if (config.symbolTolerances) {
      Object.entries(config.symbolTolerances).forEach(([symbol, tolerance]) => {
        this.setSymbolTolerance(symbol, tolerance);
      });
    }

    if (config.telegram) {
      this.setTelegramConfig(config.telegram.enabled, config.telegram.token, config.telegram.chatId);
    }

    if (config.slack) {
      this.setSlackConfig(config.slack.enabled, config.slack.token, config.slack.channel);
    }
  }

  /**
   * 重置配置为默认值
   */
  reset(): void {
    this.config = {
      defaultPriceTolerance: 1.0,
      symbolTolerances: {},
      telegram: {
        enabled: false,
        token: "",
        chatId: "",
      },
      slack: {
        enabled: false,
        token: "",
        channel: "",
      }
    };
  }

  /**
   * 获取完整配置
   */
  getConfig(): TradingConfig {
    return this.exportConfig();
  }
}