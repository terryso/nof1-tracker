# Nof1 AI Agent 跟单系统 - 文档中心

## 📚 文档导航

### 🚀 快速开始
- **[../README.md](../README.md)** - 项目主README，快速上手指南
- **[quick-reference.md](./quick-reference.md)** - 快速参考手册，常用命令速查

### 📖 核心文档
- **[follow-strategy.md](./follow-strategy.md)** - 完整的跟单策略文档
  - 系统架构详解
  - 跟单策略规则（5种策略）
  - OID机制说明
  - 风险评估系统
  - 实际使用场景
  - 监控和日志
  - 故障处理


### 🔧 功能说明
- **[orphaned-orders-cleanup.md](./orphaned-orders-cleanup.md)** - 孤立挂单清理功能
  - 问题描述和解决方案
  - 实现细节
  - 使用场景
  - 测试覆盖

- **[futures-capital-management.md](./futures-capital-management.md)** - 资金管理系统
  - 资金分配原则
  - 计算公式
  - 使用示例
  - 配置建议

- **[price-tolerance.md](./price-tolerance.md)** - 价格容忍度机制
  - 机制说明
  - 配置方法
  - 使用场景
  - 最佳实践

- **[slack-integration.md](./slack-integration.md)** - Slack集成指南
  - 如何创建Slack App
  - OAuth Token获取方法
  - 获取频道名称
  - 添加机器人到频道
  - 环境变量配置
  - 测试和故障排除

### 🔄 开发文档
- **[okx-integration-guide.md](./okx-integration-guide.md)** - OKX API 集成指南
  - 完整的集成架构设计
  - 分阶段实施计划（7-10天）
  - 技术实现细节和代码示例
  - 配置指南和API申请说明
  - 开发检查清单和测试策略

- **[REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)** - 代码重构总结
  - 重构目标和成果
  - 架构变化对比
  - 新增服务模块
  - 设计模式应用
  - 新增功能列表
  - 代码质量提升
  - 迁移指南

---

## 📊 系统架构概览

### 核心服务层

```
src/
├── commands/              # CLI命令处理器
│   ├── agents.ts         # 查看AI Agent列表
│   ├── follow.ts         # 跟单命令（核心）
│   └── status.ts         # 系统状态检查
│
├── services/             # 核心服务层
│   ├── api-client.ts            # NOF1 API通信
│   ├── follow-service.ts        # 跟单核心逻辑
│   ├── position-manager.ts      # 仓位管理
│   ├── risk-manager.ts          # 风险评估
│   ├── futures-capital-manager.ts # 资金管理
│   ├── trading-executor.ts      # 交易执行
│   ├── order-history-manager.ts # 订单历史
│   ├── binance-service.ts       # Binance API
│   └── config-manager.ts        # 配置管理
│
├── scripts/
│   └── analyze-api.ts    # API分析协调层
│
├── types/                # TypeScript类型定义
├── utils/                # 工具函数
└── config/               # 配置常量
```

### 服务职责

| 服务 | 职责 | 核心方法 |
|------|------|---------|
| **ApiClient** | NOF1 API通信 | `getAccountTotals()`, `getAgentData()` |
| **FollowService** | 跟单核心逻辑 | `followAgent()`, `detectPositionChanges()` |
| **PositionManager** | 仓位操作管理 | `openPosition()`, `closePosition()`, `cleanOrphanedOrders()` |
| **RiskManager** | 风险评估控制 | `assessRisk()`, `checkPriceTolerance()` |
| **FuturesCapitalManager** | 资金管理 | `allocateMargin()`, `validateAllocation()` |
| **TradingExecutor** | 交易执行 | `executePlan()`, `executePlanWithStopOrders()` |
| **OrderHistoryManager** | 订单历史 | `isOrderProcessed()`, `saveProcessedOrder()` |

---

## 🎯 核心功能

### 1. 跟单策略（5种）
0. **孤立挂单清理** - 每次轮询前自动执行
1. **换仓检测** - entry_oid变化时先平仓再开仓
2. **新开仓检测** - 跟随Agent开新仓位
3. **平仓检测** - 跟随Agent平仓
4. **止盈止损检测** - 价格达到目标自动平仓

### 2. 风险控制
- **风险评分** - 基于杠杆的风险评分系统
- **价格容忍度** - 防止价格偏离过大时执行交易
- **订单去重** - 防止重复执行同一订单
- **余额检查** - 执行前验证账户余额

### 3. 资金管理
- **比例分配** - 按Agent原始保证金比例分配
- **杠杆保持** - 完全复制Agent的杠杆倍数
- **数量调整** - 根据分配资金重新计算交易数量
- **精度控制** - 符合交易所精度要求

### 4. 自动化
- **止盈止损单** - 开仓时自动创建
- **孤立挂单清理** - 自动清理遗留挂单
- **持续监控** - 可配置轮询间隔
- **优雅退出** - Ctrl+C安全停止

---

## 🚀 快速命令参考

```bash
# 查看所有可用AI Agent
npm start -- agents

# 风险评估模式（不执行交易）
npm start -- follow deepseek-chat-v3.1 --risk-only

# 实际跟单交易
npm start -- follow deepseek-chat-v3.1

# 持续监控（每60秒轮询）
npm start -- follow deepseek-chat-v3.1 --interval 60

# 设置价格容忍度（1%）
npm start -- follow deepseek-chat-v3.1 --price-tolerance 1.0

# 设置总保证金（1000 USDT）
npm start -- follow gpt-5 --total-margin 1000

# 组合使用
npm start -- follow gpt-5 --interval 30 --total-margin 2000 --price-tolerance 0.5
```

---

## 🤖 支持的AI Agent

| Agent | 特点 | 风险等级 |
|-------|------|---------|
| `buynhold_btc` | 保守策略 | 低风险 |
| `claude-sonnet-4-5` | 平衡策略 | 中风险 |
| `deepseek-chat-v3.1` | 积极策略 | 高风险 |
| `gpt-5` | 激进策略 | 极高风险 |
| `gemini-2.5-pro` | 智能策略 | 中高风险 |
| `grok-4` | 创新策略 | 高风险 |
| `qwen3-max` | 均衡策略 | 中风险 |

---

## ⚠️ 风险提示

- **合约交易风险**: 使用杠杆可能导致快速亏损
- **测试环境**: 强烈建议先在Binance Testnet测试
- **风险管理**: 建议杠杆≤10x，使用专门的交易账户
- **跟单风险**: AI Agent的策略不保证盈利
- **资金安全**: 避免投入无法承受损失的资金

---

## 📞 技术支持

### 问题反馈
如果遇到问题，请提供：
1. 系统信息（操作系统、Node.js版本）
2. 错误描述（完整错误信息、复现步骤）
3. 日志信息（控制台输出、API响应）

### 联系方式
- GitHub Issues: [项目Issues页面]
- 文档更新: 请提交PR到文档仓库
- 功能建议: 通过Issues提交feature request

---

## 🔄 版本历史

### v2.1.0 (2025-01-XX)
- ✨ 新增Slack集成支持
- 📝 新增Slack配置文档
- 🔧 环境变量名称修复 (SLACK_OAUTH_TOKEN, SLACK_CHANNEL_NAME)
- 📚 完善集成指南

### v2.0.0 (2025-10-24)
- ✨ 重构为模块化服务层架构
- ✨ 新增订单去重机制
- ✨ 新增孤立挂单清理功能
- ✨ 新增价格容忍度检查
- ✨ 新增资金管理系统
- 📝 完善文档和测试

### v1.0.0 (2025-10-23)
- 🎉 初始版本发布
- 📊 基础跟单功能
- 🤖 支持7个AI Agent

---

## 📝 文档维护

本文档中心由以下文件组成：
- 7个核心文档文件
- 1个重构总结文档
- 完整的代码注释
- 31个测试文件

**最后更新**: 2025-01-XX  
**文档版本**: v2.1.0  
**系统版本**: nof1-tracker v2.1.0

---

*免责声明: 本文档仅供学习和参考使用。实际交易存在资金损失风险，请谨慎使用并遵守相关法律法规。*
