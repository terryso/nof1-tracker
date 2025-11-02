# 数据提供者抽象层

## 概述

为了应对 nof1 API 可能停用的情况,我们对代码进行了抽象化重构。现在数据获取逻辑与具体的 API 实现解耦,你可以轻松切换到其他数据源而无需修改核心业务逻辑。

## 架构设计

```
┌─────────────────┐
│  ApiClient      │  ← 保持向后兼容的适配器
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ IDataProvider   │  ← 数据提供者接口
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌─────────┐ ┌──────────────┐
│ Nof1    │ │ 自定义实现    │
│ Data    │ │ (你的新API)   │
│ Provider│ │              │
└─────────┘ └──────────────┘
```

## 核心文件

### 1. 数据提供者接口
**文件**: `src/services/data-provider.ts`

定义了标准的数据提供者接口 `IDataProvider`,包含以下方法:
- `getAccountTotals(marker?)` - 获取账户总览数据
- `getAvailableAgents()` - 获取可用的 Agent 列表
- `getAgentData(agentId, marker?)` - 获取特定 Agent 的数据
- `clearCache()` - 清除缓存
- `getCacheStats()` - 获取缓存统计信息

### 2. Nof1 数据提供者实现
**文件**: `src/services/nof1-data-provider.ts`

默认的数据提供者实现,封装了 nof1 API 的调用逻辑。

### 3. API 客户端适配器
**文件**: `src/services/api-client.ts`

重构后的 `ApiClient` 作为适配器,内部使用注入的数据提供者。保持了向后兼容性,现有代码无需修改。

## 如何切换到新的数据源

### 步骤 1: 创建自定义数据提供者

参考示例文件 `src/services/custom-data-provider.example.ts`,创建你自己的数据提供者:

```typescript
import { IDataProvider, DataProviderResponse } from './data-provider';
import { AgentAccount } from '../types/api';

export class MyCustomDataProvider implements IDataProvider {
  constructor(
    private apiEndpoint: string,
    private apiKey: string
  ) {}

  async getAccountTotals(marker?: number): Promise<DataProviderResponse> {
    // 调用你的新 API
    const response = await fetch(`${this.apiEndpoint}/accounts`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
    const data = await response.json();
    
    // 转换为标准格式
    const accountTotals: AgentAccount[] = this.transformData(data);
    
    return { accountTotals };
  }

  async getAvailableAgents(): Promise<string[]> {
    const response = await this.getAccountTotals();
    return [...new Set(response.accountTotals.map(a => a.model_id))];
  }

  async getAgentData(agentId: string, marker?: number): Promise<AgentAccount | null> {
    const response = await this.getAccountTotals(marker);
    return response.accountTotals.find(a => a.model_id === agentId) || null;
  }

  clearCache(): void {
    // 实现缓存清理逻辑
  }

  getCacheStats() {
    // 实现缓存统计逻辑
    return { size: 0, entries: [] };
  }

  private transformData(rawData: any): AgentAccount[] {
    // 将你的 API 数据转换为 AgentAccount 格式
    // 必须包含以下字段:
    // - id: string
    // - model_id: string
    // - since_inception_hourly_marker: number
    // - positions: Record<string, Position>
    return [];
  }
}
```

### 步骤 2: 注入自定义数据提供者

在 `src/scripts/analyze-api.ts` 的 `ApiAnalyzer` 构造函数中注入:

```typescript
import { MyCustomDataProvider } from '../services/my-custom-data-provider';

export class ApiAnalyzer {
  constructor(
    baseUrlOrConfigManager?: string | ConfigManager,
    apiClient?: ApiClient
  ) {
    // ... 现有代码 ...
    
    // 创建自定义数据提供者
    const customProvider = new MyCustomDataProvider(
      process.env.MY_API_ENDPOINT || '',
      process.env.MY_API_KEY || ''
    );
    
    // 注入到 ApiClient
    this.apiClient = new ApiClient(
      undefined,
      undefined,
      customProvider  // 使用自定义提供者
    );
    
    // ... 其余代码保持不变 ...
  }
}
```

### 步骤 3: 添加环境变量

在 `.env` 文件中添加新 API 的配置:

```bash
# 你的新 API 配置
MY_API_ENDPOINT=https://your-api.com
MY_API_KEY=your-api-key
```

## 数据格式要求

你的新 API 必须能够提供以下数据结构(或能转换为此结构):

### AgentAccount
```typescript
{
  id: string;                           // Agent 唯一标识
  model_id: string;                     // Agent 模型 ID
  since_inception_hourly_marker: number; // 时间标记
  positions: Record<string, Position>;   // 仓位信息
}
```

### Position
```typescript
{
  symbol: string;           // 交易对符号 (如 'BTC')
  entry_price: number;      // 入场价格
  quantity: number;         // 持仓数量 (正数=多头,负数=空头)
  leverage: number;         // 杠杆倍数
  current_price: number;    // 当前价格
  unrealized_pnl: number;   // 未实现盈亏
  confidence: number;       // 置信度
  entry_oid: number;        // 入场订单 ID
  tp_oid: number;          // 止盈订单 ID
  sl_oid: number;          // 止损订单 ID
  margin: number;          // 保证金
  exit_plan: {
    profit_target: number;        // 盈利目标
    stop_loss: number;            // 止损价格
    invalidation_condition: string; // 失效条件
  };
}
```

## 优势

1. **解耦**: 核心业务逻辑与数据源实现完全分离
2. **灵活**: 可以轻松切换不同的数据源
3. **向后兼容**: 现有代码无需修改即可继续工作
4. **可测试**: 可以轻松创建 Mock 数据提供者用于测试
5. **简洁**: 只抽象了实际使用的数据,没有过度设计

## 测试

你可以创建一个 Mock 数据提供者用于测试:

```typescript
export class MockDataProvider implements IDataProvider {
  async getAccountTotals(): Promise<DataProviderResponse> {
    return {
      accountTotals: [
        {
          id: 'test-agent',
          model_id: 'test-agent',
          since_inception_hourly_marker: Date.now(),
          positions: {
            'BTC': {
              symbol: 'BTC',
              entry_price: 50000,
              quantity: 0.1,
              // ... 其他字段
            }
          }
        }
      ]
    };
  }
  
  // ... 实现其他方法
}
```

## 注意事项

1. **数据转换**: 确保你的新 API 数据能正确转换为 `AgentAccount` 和 `Position` 格式
2. **错误处理**: 在自定义提供者中实现适当的错误处理
3. **缓存策略**: 根据你的 API 特性实现合适的缓存策略
4. **性能**: 注意 API 调用频率,避免触发限流

## 迁移检查清单

- [ ] 创建自定义数据提供者类
- [ ] 实现 `IDataProvider` 接口的所有方法
- [ ] 实现数据格式转换逻辑
- [ ] 添加必要的环境变量
- [ ] 在 `ApiAnalyzer` 中注入自定义提供者
- [ ] 测试所有功能是否正常工作
- [ ] 更新 `.env.example` 文件
- [ ] 更新相关文档

## 支持

如有问题,请参考:
- 接口定义: `src/services/data-provider.ts`
- 示例实现: `src/services/nof1-data-provider.ts`
- 使用示例: `src/services/custom-data-provider.example.ts`
