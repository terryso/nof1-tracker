# 数据提供者架构图

## 重构前的架构

```
┌─────────────────────────────────────────┐
│          ApiAnalyzer                    │
│  (业务逻辑 + 数据获取)                    │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│          ApiClient                      │
│  (直接调用 nof1 API)                     │
│  - axios 实例                            │
│  - 缓存管理                              │
│  - 数据转换                              │
└────────────────┬────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │  nof1 API     │
         │  (固定依赖)    │
         └───────────────┘
```

**问题**: 
- ❌ 业务逻辑与数据源紧耦合
- ❌ 无法切换数据源
- ❌ 难以测试


## 重构后的架构

```
┌─────────────────────────────────────────┐
│          ApiAnalyzer                    │
│  (纯业务逻辑)                            │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│          ApiClient                      │
│  (适配器模式 - 保持向后兼容)              │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│       IDataProvider (接口)              │
│  - getAccountTotals()                   │
│  - getAvailableAgents()                 │
│  - getAgentData()                       │
│  - clearCache()                         │
│  - getCacheStats()                      │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌──────────────┐  ┌──────────────────┐
│ Nof1Data     │  │ CustomData       │
│ Provider     │  │ Provider         │
│ (默认实现)    │  │ (你的新API)       │
└──────┬───────┘  └──────┬───────────┘
       │                 │
       ▼                 ▼
┌─────────────┐  ┌─────────────────┐
│  nof1 API   │  │  你的新 API      │
└─────────────┘  └─────────────────┘
```

**优势**:
- ✅ 业务逻辑与数据源解耦
- ✅ 可以轻松切换数据源
- ✅ 易于测试和维护
- ✅ 保持向后兼容


## 数据流向

### 获取 Agent 数据流程

```
用户命令
   │
   ▼
ApiAnalyzer.followAgent()
   │
   ▼
ApiClient.getAgentData()
   │
   ▼
IDataProvider.getAgentData()
   │
   ├─→ Nof1DataProvider (默认)
   │      │
   │      ▼
   │   nof1 API
   │
   └─→ CustomDataProvider (可选)
          │
          ▼
       你的新 API
```

### 切换数据源的过程

```
1. 实现 IDataProvider 接口
   ↓
2. 在构造函数中注入
   ↓
3. 无需修改业务代码
   ↓
4. 系统继续正常工作
```


## 核心组件职责

### IDataProvider (接口)
- 定义数据获取的标准方法
- 不关心具体实现细节
- 确保所有实现返回统一格式

### Nof1DataProvider (默认实现)
- 封装 nof1 API 调用逻辑
- 处理 HTTP 请求和响应
- 管理缓存策略
- 数据格式转换

### ApiClient (适配器)
- 保持向后兼容的接口
- 委托给注入的 DataProvider
- 简化调用方代码

### ApiAnalyzer (业务逻辑)
- 专注于跟单策略
- 不关心数据来源
- 使用 ApiClient 获取数据


## 扩展性

### 添加新的数据源

```typescript
// 1. 创建新的实现
class MyDataProvider implements IDataProvider {
  // 实现接口方法
}

// 2. 注入使用
const provider = new MyDataProvider();
const apiClient = new ApiClient(undefined, undefined, provider);

// 3. 业务代码无需改动
const analyzer = new ApiAnalyzer(configManager, apiClient);
```

### 添加数据源切换逻辑

```typescript
// 可以根据配置动态选择数据源
const provider = config.useCustomApi 
  ? new CustomDataProvider(config.customApiUrl)
  : new Nof1DataProvider();

const apiClient = new ApiClient(undefined, undefined, provider);
```

### 添加多数据源聚合

```typescript
class AggregatedDataProvider implements IDataProvider {
  constructor(
    private providers: IDataProvider[]
  ) {}

  async getAccountTotals() {
    // 从多个数据源聚合数据
    const results = await Promise.all(
      this.providers.map(p => p.getAccountTotals())
    );
    
    // 合并结果
    return this.mergeResults(results);
  }
}
```


## 测试策略

### Mock 数据提供者

```typescript
class MockDataProvider implements IDataProvider {
  async getAccountTotals() {
    return {
      accountTotals: [/* 测试数据 */]
    };
  }
  // ... 其他方法
}

// 在测试中使用
const mockProvider = new MockDataProvider();
const apiClient = new ApiClient(undefined, undefined, mockProvider);
```

这样可以完全控制测试数据,无需依赖真实 API。
