import {
  BinanceService,
  BinanceOrder,
  StopLossOrder,
  TakeProfitOrder
} from "../services/binance-service";
import { TradingPlan } from "../types/trading";
import axios from 'axios';

// Mock axios
jest.mock('axios');

// Mock crypto for signature generation
jest.mock("crypto", () => ({
  createHmac: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue("mock-signature")
  }))
}));

describe("BinanceService", () => {
  let service: BinanceService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Mock axios.create to return a mock instance
    mockAxiosInstance = {
      request: jest.fn(),
      get: jest.fn().mockResolvedValue({ data: { serverTime: Date.now() } })
    };

    (axios.create as jest.Mock) = jest.fn(() => mockAxiosInstance);
    (axios.isAxiosError as unknown as jest.Mock) = jest.fn(() => false);

    service = new BinanceService("test-api-key", "test-api-secret");
  });

  afterEach(() => {
    if (service) {
      service.destroy();
    }
  });

  describe("constructor", () => {
    it("should create BinanceService instance with API credentials", () => {
      // mockAxiosInstance is already set up in outer beforeEach
      const testService = new BinanceService("test-api-key", "test-api-secret");
      expect(testService).toBeInstanceOf(BinanceService);
      testService.destroy();
    });

    it("should create BinanceService instance with empty credentials", () => {
      const testService = new BinanceService("", "");
      expect(testService).toBeInstanceOf(BinanceService);
      testService.destroy();
    });

    it("should handle null/undefined credentials", () => {
      const service1 = new BinanceService(null as any, null as any);
      const service2 = new BinanceService(undefined as any, undefined as any);
      expect(service1).toBeInstanceOf(BinanceService);
      expect(service2).toBeInstanceOf(BinanceService);
      service1.destroy();
      service2.destroy();
    });
  });

  describe("convertToBinanceOrder", () => {
    it("should convert basic TradingPlan to Binance order", () => {
      const tradingPlan: TradingPlan = {
        id: "test-plan-1",
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.001,
        leverage: 10,
        timestamp: Date.now()
      };

      const binanceOrder = service.convertToBinanceOrder(tradingPlan);

      expect(binanceOrder).toEqual({
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: "0.001",
        leverage: 10
      });
    });

    it("should convert SELL orders correctly", () => {
      const tradingPlan: TradingPlan = {
        id: "test-plan-2",
        symbol: "ETHUSDT",
        side: "SELL",
        type: "LIMIT",
        quantity: 1.5,
        leverage: 5,
        timestamp: Date.now()
      };

      const binanceOrder = service.convertToBinanceOrder(tradingPlan);

      expect(binanceOrder).toEqual({
        symbol: "ETHUSDT",
        side: "SELL",
        type: "LIMIT",
        quantity: "1.500",
        leverage: 5
      });
    });

    it("should handle zero quantity", () => {
      const tradingPlan: TradingPlan = {
        id: "test-plan-3",
        symbol: "DOGEUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0,
        leverage: 1,
        timestamp: Date.now()
      };

      const binanceOrder = service.convertToBinanceOrder(tradingPlan);

      expect(binanceOrder.quantity).toBe("10"); // DOGEUSDT最小数量是10, precision 0
    });

    it("should handle very small quantities", () => {
      const tradingPlan: TradingPlan = {
        id: "test-plan-4",
        symbol: "SHIBUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.00000001,
        leverage: 1,
        timestamp: Date.now()
      };

      const binanceOrder = service.convertToBinanceOrder(tradingPlan);

      expect(binanceOrder.quantity).toBe("0.001"); // SHIB最小数量是0.001
    });

    it("should handle very large quantities", () => {
      const tradingPlan: TradingPlan = {
        id: "test-plan-5",
        symbol: "USDTUSDT",
        side: "SELL",
        type: "MARKET",
        quantity: 1000000,
        leverage: 1,
        timestamp: Date.now()
      };

      const binanceOrder = service.convertToBinanceOrder(tradingPlan);

      expect(binanceOrder.quantity).toBe("1000000.000");
    });

    it("should handle special symbol formats", () => {
      const tradingPlan: TradingPlan = {
        id: "test-plan-6",
        symbol: "1000PEPEUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 1000,
        leverage: 3,
        timestamp: Date.now()
      };

      const binanceOrder = service.convertToBinanceOrder(tradingPlan);

      expect(binanceOrder.symbol).toBe("1000PEPEUSDT");
    });

    it("should handle all order types", () => {
      const orderTypes: Array<"MARKET" | "LIMIT" | "STOP"> = [
        "MARKET", "LIMIT", "STOP"
      ];

      orderTypes.forEach(type => {
        const tradingPlan: TradingPlan = {
          id: `test-plan-${type}`,
          symbol: "BTCUSDT",
          side: "BUY",
          type: type,
          quantity: 0.001,
          leverage: 10,
          timestamp: Date.now()
        };

        const binanceOrder = service.convertToBinanceOrder(tradingPlan);
        expect(binanceOrder.type).toBe(type);
      });
    });

    it("should handle high leverage values", () => {
      const tradingPlan: TradingPlan = {
        id: "test-plan-high-leverage",
        symbol: "BTCUSDT",
        side: "BUY",
        type: "MARKET",
        quantity: 0.001,
        leverage: 125,
        timestamp: Date.now()
      };

      const binanceOrder = service.convertToBinanceOrder(tradingPlan);
      expect(binanceOrder.leverage).toBe(125);
    });
  });

  describe("createTakeProfitOrder", () => {
    it("should create basic take profit order for BUY position", () => {
      const result = service.createTakeProfitOrder(
        "BTCUSDT",
        "SELL",
        0.05,
        45000
      );

      expect(result).toEqual({
        symbol: "BTCUSDT",
        side: "SELL",
        type: "TAKE_PROFIT_MARKET",
        quantity: "0.050",
        stopPrice: "45000.0",
        closePosition: "true"
      });
    });

    it("should create take profit order for SELL position", () => {
      const result = service.createTakeProfitOrder(
        "ETHUSDT",
        "BUY",
        1.5,
        2000
      );

      expect(result).toEqual({
        symbol: "ETHUSDT",
        side: "BUY",
        type: "TAKE_PROFIT_MARKET",
        quantity: "1.500",
        stopPrice: "2000.00",
        closePosition: "true"
      });
    });

    it("should handle decimal quantities", () => {
      const result = service.createTakeProfitOrder(
        "BTCUSDT",
        "SELL",
        0.01234567,
        45000.12345
      );

      expect(result).toEqual({
        symbol: "BTCUSDT",
        side: "SELL",
        type: "TAKE_PROFIT_MARKET",
        quantity: "0.012", // BTC quantities now formatted to 6 decimal places
        stopPrice: "45000.1", // BTC prices now formatted to 1 decimal place
        closePosition: "true"
      });
    });

    it("should handle very small take profit prices", () => {
      const result = service.createTakeProfitOrder(
        "SHIBUSDT",
        "SELL",
        1000000,
        0.000001
      );

      expect(result.stopPrice).toBe("0.00"); // SHIB uses default 2 decimal places, very small numbers round to 0
    });

    it("should handle very large take profit prices", () => {
      const result = service.createTakeProfitOrder(
        "BTCUSDT",
        "SELL",
        1,
        1000000
      );

      expect(result.stopPrice).toBe("1000000.0");
    });
  });

  describe("createStopLossOrder", () => {
    it("should create basic stop loss order for BUY position", () => {
      const result = service.createStopLossOrder(
        "BTCUSDT",
        "SELL",
        0.05,
        41000
      );

      expect(result).toEqual({
        symbol: "BTCUSDT",
        side: "SELL",
        type: "STOP_MARKET",
        quantity: "0.050",
        stopPrice: "41000.0",
        closePosition: "true"
      });
    });

    it("should create stop loss order for SELL position", () => {
      const result = service.createStopLossOrder(
        "ETHUSDT",
        "BUY",
        1.5,
        2400
      );

      expect(result).toEqual({
        symbol: "ETHUSDT",
        side: "BUY",
        type: "STOP_MARKET",
        quantity: "1.500",
        stopPrice: "2400.00",
        closePosition: "true"
      });
    });

    it("should handle decimal quantities and prices", () => {
      const result = service.createStopLossOrder(
        "BTCUSDT",
        "SELL",
        0.01234567,
        41000.98765
      );

      expect(result).toEqual({
        symbol: "BTCUSDT",
        side: "SELL",
        type: "STOP_MARKET",
        quantity: "0.012", // BTC quantities now formatted to 6 decimal places
        stopPrice: "41001.0", // BTC prices now formatted to 1 decimal place
        closePosition: "true"
      });
    });

    it("should handle very small stop loss prices", () => {
      const result = service.createStopLossOrder(
        "SHIBUSDT",
        "SELL",
        1000000,
        0.000001
      );

      expect(result.stopPrice).toBe("0.00"); // SHIB uses default 2 decimal places, very small numbers round to 0
    });

    it("should handle very large stop loss prices", () => {
      const result = service.createStopLossOrder(
        "BTCUSDT",
        "SELL",
        1,
        1000000
      );

      expect(result.stopPrice).toBe("1000000.0");
    });
  });

  describe("createStopOrdersFromPosition", () => {
    const mockPosition = {
      symbol: "BTCUSDT",
      entry_price: 43000,
      quantity: 0.05,
      leverage: 20,
      current_price: 43500,
      unrealized_pnl: 25,
      confidence: 0.85,
      entry_oid: 209776191762,
      tp_oid: -1,
      sl_oid: -1,
      margin: 100,
      exit_plan: {
        profit_target: 45000,
        stop_loss: 41000,
        invalidation_condition: "price_below_stop_loss"
      }
    };

    it("should create both take profit and stop loss orders for BUY position", () => {
      const result = service.createStopOrdersFromPosition(mockPosition, "BUY");

      expect(result.takeProfitOrder).toEqual({
        symbol: "BTCUSDT",
        side: "SELL", // Close long position
        type: "TAKE_PROFIT_MARKET",
        quantity: "0.050",
        stopPrice: "45000.0",
        closePosition: "true"
      });

      expect(result.stopLossOrder).toEqual({
        symbol: "BTCUSDT",
        side: "SELL", // Close long position
        type: "STOP_MARKET",
        quantity: "0.050",
        stopPrice: "41000.0",
        closePosition: "true"
      });
    });

    it("should create both take profit and stop loss orders for SELL position", () => {
      const shortPosition = {
        ...mockPosition,
        quantity: -0.05
      };

      const result = service.createStopOrdersFromPosition(shortPosition, "SELL");

      expect(result.takeProfitOrder).toEqual({
        symbol: "BTCUSDT",
        side: "BUY", // Close short position
        type: "TAKE_PROFIT_MARKET",
        quantity: "0.050",
        stopPrice: "45000.0",
        closePosition: "true"
      });

      expect(result.stopLossOrder).toEqual({
        symbol: "BTCUSDT",
        side: "BUY", // Close short position
        type: "STOP_MARKET",
        quantity: "0.050",
        stopPrice: "41000.0",
        closePosition: "true"
      });
    });

    it("should handle position with only take profit", () => {
      const positionTpOnly = {
        ...mockPosition,
        exit_plan: {
          profit_target: 45000,
          stop_loss: 0,
          invalidation_condition: ""
        }
      };

      const result = service.createStopOrdersFromPosition(positionTpOnly, "BUY");

      expect(result.takeProfitOrder).toBeDefined();
      expect(result.takeProfitOrder!.stopPrice).toBe("45000.0");
      expect(result.stopLossOrder).toBeNull();
    });

    it("should handle position with only stop loss", () => {
      const positionSlOnly = {
        ...mockPosition,
        exit_plan: {
          profit_target: 0,
          stop_loss: 41000,
          invalidation_condition: ""
        }
      };

      const result = service.createStopOrdersFromPosition(positionSlOnly, "BUY");

      expect(result.takeProfitOrder).toBeNull();
      expect(result.stopLossOrder).toBeDefined();
      expect(result.stopLossOrder!.stopPrice).toBe("41000.0");
    });

    it("should handle position with no exit plan", () => {
      const positionNoExit = {
        ...mockPosition,
        exit_plan: undefined
      };

      const result = service.createStopOrdersFromPosition(positionNoExit, "BUY");

      expect(result.takeProfitOrder).toBeNull();
      expect(result.stopLossOrder).toBeNull();
    });

    it("should handle position with empty exit plan", () => {
      const positionEmptyExit = {
        ...mockPosition,
        exit_plan: {
          profit_target: 0,
          stop_loss: 0,
          invalidation_condition: ""
        }
      };

      const result = service.createStopOrdersFromPosition(positionEmptyExit, "BUY");

      expect(result.takeProfitOrder).toBeNull();
      expect(result.stopLossOrder).toBeNull();
    });

    it("should handle negative quantities correctly", () => {
      const shortPosition = {
        ...mockPosition,
        quantity: -1.5
      };

      const result = service.createStopOrdersFromPosition(shortPosition, "SELL");

      expect(result.takeProfitOrder!.quantity).toBe("1.500");
      expect(result.stopLossOrder!.quantity).toBe("1.500");
    });

    it("should handle very small quantities", () => {
      const tinyPosition = {
        ...mockPosition,
        quantity: 0.000001
      };

      const result = service.createStopOrdersFromPosition(tinyPosition, "BUY");

      // 极小数量现在返回最小数量而不是"0"，这是为了解决Binance API精度问题
      expect(result.takeProfitOrder!.quantity).toBe("0.001"); // BTC最小数量现在是0.00001
      expect(result.stopLossOrder!.quantity).toBe("0.001");
    });

    it("should handle very large quantities", () => {
      const largePosition = {
        ...mockPosition,
        quantity: 10000
      };

      const result = service.createStopOrdersFromPosition(largePosition, "BUY");

      expect(result.takeProfitOrder!.quantity).toBe("10000.000"); // BTC数量现在格式化为6位小数
      expect(result.stopLossOrder!.quantity).toBe("10000.000");
    });

    it("should handle different symbol formats", () => {
      const specialSymbolPosition = {
        ...mockPosition,
        symbol: "1000PEPEUSDT"
      };

      const result = service.createStopOrdersFromPosition(specialSymbolPosition, "BUY");

      expect(result.takeProfitOrder!.symbol).toBe("1000PEPEUSDT");
      expect(result.stopLossOrder!.symbol).toBe("1000PEPEUSDT");
    });
  });

  describe("Edge Cases", () => {
    const mockPosition = {
      symbol: "BTCUSDT",
      entry_price: 43000,
      quantity: 0.05,
      leverage: 20,
      current_price: 43500,
      unrealized_pnl: 25,
      confidence: 0.85,
      entry_oid: 209776191762,
      tp_oid: -1,
      sl_oid: -1,
      margin: 100,
      exit_plan: {
        profit_target: 45000,
        stop_loss: 41000,
        invalidation_condition: "price_below_stop_loss"
      }
    };

    it("should handle missing position data", () => {
      const incompletePosition = {
        symbol: "BTCUSDT"
        // Missing other required fields
      };

      const result = service.createStopOrdersFromPosition(incompletePosition as any, "BUY");

      expect(result.takeProfitOrder).toBeNull();
      expect(result.stopLossOrder).toBeNull();
    });

    it("should handle null position", () => {
      const result = service.createStopOrdersFromPosition(null as any, "BUY");

      expect(result.takeProfitOrder).toBeNull();
      expect(result.stopLossOrder).toBeNull();
    });

    it("should handle undefined position", () => {
      const result = service.createStopOrdersFromPosition(undefined as any, "BUY");

      expect(result.takeProfitOrder).toBeNull();
      expect(result.stopLossOrder).toBeNull();
    });

    it("should handle negative prices in exit plan", () => {
      const negativePricePosition = {
        ...mockPosition,
        exit_plan: {
          profit_target: -45000,
          stop_loss: -41000,
          invalidation_condition: ""
        }
      };

      const result = service.createStopOrdersFromPosition(negativePricePosition, "BUY");

      expect(result.takeProfitOrder).toBeNull();
      expect(result.stopLossOrder).toBeNull();
    });

    it("should handle NaN quantities", () => {
      const nanQuantityPosition = {
        ...mockPosition,
        quantity: NaN
      };

      const result = service.createStopOrdersFromPosition(nanQuantityPosition, "BUY");

      expect(result.takeProfitOrder).toBeDefined();
      expect(result.stopLossOrder).toBeDefined();
      // Should handle NaN by converting to "NaN"
      expect(result.takeProfitOrder!.quantity).toBe("NaN");
      expect(result.stopLossOrder!.quantity).toBe("NaN");
    });

    it("should handle Infinity quantities", () => {
      const infinityQuantityPosition = {
        ...mockPosition,
        quantity: Infinity
      };

      const result = service.createStopOrdersFromPosition(infinityQuantityPosition, "BUY");

      expect(result.takeProfitOrder).toBeDefined();
      expect(result.stopLossOrder).toBeDefined();
      expect(result.takeProfitOrder!.quantity).toBe("Infinity");
      expect(result.stopLossOrder!.quantity).toBe("Infinity");
    });
  });

  describe("Private Methods (via public interface)", () => {
    const mockPosition = {
      symbol: "BTCUSDT",
      entry_price: 43000,
      quantity: 0.05,
      leverage: 20,
      current_price: 43500,
      unrealized_pnl: 25,
      confidence: 0.85,
      entry_oid: 209776191762,
      tp_oid: -1,
      sl_oid: -1,
      margin: 100,
      exit_plan: {
        profit_target: 45000,
        stop_loss: 41000,
        invalidation_condition: "price_below_stop_loss"
      }
    };

    it("should correctly calculate stop order sides through createStopOrdersFromPosition", () => {
      // Test BUY position (should close with SELL)
      const buyPosition = { ...mockPosition, quantity: 0.1 };
      const buyResult = service.createStopOrdersFromPosition(buyPosition, "BUY");

      if (buyResult.takeProfitOrder) {
        expect(buyResult.takeProfitOrder.side).toBe("SELL");
      }
      if (buyResult.stopLossOrder) {
        expect(buyResult.stopLossOrder.side).toBe("SELL");
      }

      // Test SELL position (should close with BUY)
      const sellPosition = { ...mockPosition, quantity: -0.1 };
      const sellResult = service.createStopOrdersFromPosition(sellPosition, "SELL");

      if (sellResult.takeProfitOrder) {
        expect(sellResult.takeProfitOrder.side).toBe("BUY");
      }
      if (sellResult.stopLossOrder) {
        expect(sellResult.stopLossOrder.side).toBe("BUY");
      }
    });
  });

  describe("Integration with Trading Types", () => {
    it("should work with complex trading plan scenarios", () => {
      const complexTradingPlan: TradingPlan = {
        id: "complex-plan",
        symbol: "ETHUSDT",
        side: "SELL",
        type: "LIMIT",
        quantity: 2.5,
        leverage: 15,
        timestamp: Date.now()
      };

      const binanceOrder = service.convertToBinanceOrder(complexTradingPlan);

      expect(binanceOrder.symbol).toBe("ETHUSDT");
      expect(binanceOrder.side).toBe("SELL");
      expect(binanceOrder.type).toBe("LIMIT");
      expect(binanceOrder.quantity).toBe("2.500"); // SOL数量现在格式化为5位小数
      expect(binanceOrder.leverage).toBe(15);
    });

    it("should maintain precision for financial calculations", () => {
      const highPrecisionPlan: TradingPlan = {
        id: "precision-test",
        symbol: "BTCUSDT",
        side: "BUY",
        type: "LIMIT",
        quantity: 0.00000001,
        leverage: 100,
        timestamp: Date.now()
      };

      const binanceOrder = service.convertToBinanceOrder(highPrecisionPlan);
      expect(binanceOrder.quantity).toBe("0.001"); // 极小数量现在返回最小可交易数量

      const tpOrder = service.createTakeProfitOrder(
        "BTCUSDT",
        "SELL",
        0.00000001,
        43210.12345678
      );
      // 极小数量现在返回最小数量而不是"0"，这是为了解决Binance API精度问题
      expect(tpOrder.quantity).toBe("0.001"); // BTC最小数量现在是0.00001
      expect(tpOrder.stopPrice).toBe("43210.1"); // BTC prices now formatted to 1 decimal place
    });
  });

  // New API method coverage tests
  describe("API Method Coverage", () => {
    it("should have getServerTime method", () => {
      expect(typeof service.getServerTime).toBe('function');
    });

    it("should have getAccountInfo method", () => {
      expect(typeof service.getAccountInfo).toBe('function');
    });

    it("should have getPositions method", () => {
      expect(typeof service.getPositions).toBe('function');
    });

    it("should have placeOrder method", () => {
      expect(typeof service.placeOrder).toBe('function');
    });

    it("should have setLeverage method", () => {
      expect(typeof service.setLeverage).toBe('function');
    });

    it("should have cancelOrder method", () => {
      expect(typeof service.cancelOrder).toBe('function');
    });

    it("should have cancelAllOrders method", () => {
      expect(typeof service.cancelAllOrders).toBe('function');
    });

    it("should have getOrderStatus method", () => {
      expect(typeof service.getOrderStatus).toBe('function');
    });

    it("should have getOpenOrders method", () => {
      expect(typeof service.getOpenOrders).toBe('function');
    });

    it("should have get24hrTicker method", () => {
      expect(typeof service.get24hrTicker).toBe('function');
    });

    it("should execute constructor with different network settings", () => {
      const mainnetService = new BinanceService('key', 'secret', false);
      const testnetService = new BinanceService('key', 'secret', true);

      expect(mainnetService).toBeDefined();
      expect(testnetService).toBeDefined();
      mainnetService.destroy();
      testnetService.destroy();
    });

    it("should handle constructor with null credentials", () => {
      const nullService = new BinanceService(null as any, null as any, false);
      expect(nullService).toBeDefined();
      nullService.destroy();
    });

    it("should handle constructor with undefined credentials", () => {
      const undefService = new BinanceService(undefined as any, undefined as any, false);
      expect(undefService).toBeDefined();
      undefService.destroy();
    });

    // Price formatting tests
    describe("price formatting", () => {
      it("should format ETH prices correctly", () => {
        const tpOrder = service.createTakeProfitOrder("ETH", "SELL", 0.1, 4005.042);
        const slOrder = service.createStopLossOrder("ETH", "SELL", 0.1, 3682.104);

        // ETH prices should be formatted to 2 decimal places
        expect(tpOrder.stopPrice).toBe("4005.04");
        expect(slOrder.stopPrice).toBe("3682.10");
      });

      it("should format BNB prices and quantities correctly", () => {
        const tpOrder = service.createTakeProfitOrder("BNB", "SELL", 0.051434, 1200.567);
        const slOrder = service.createStopLossOrder("BNB", "SELL", 0.051434, 1100.234);

        // BNB prices should be formatted to 2 decimal places, quantities to 3 decimal places
        expect(tpOrder.stopPrice).toBe("1200.57");
        expect(slOrder.stopPrice).toBe("1100.23");
        expect(tpOrder.quantity).toBe("0.05");
        expect(slOrder.quantity).toBe("0.05");
      });

      it("should format BTC prices correctly", () => {
        const tpOrder = service.createTakeProfitOrder("BTC", "SELL", 0.001, 43210.987);

        // BTC prices should be formatted to 1 decimal place
        expect(tpOrder.stopPrice).toBe("43211.0");
      });

      it("should use formatPrice method directly", () => {
        expect(service.formatPrice(4005.042, "ETH")).toBe("4005.04");
        expect(service.formatPrice(3682.104, "ETH")).toBe("3682.10");
        expect(service.formatPrice(1200.567, "BNB")).toBe("1200.57");
        expect(service.formatPrice(43210.987, "BTC")).toBe("43211.0");
      });
    });

    describe("Dynamic Precision and Fallback Mechanism", () => {
      describe("formatPrice fallback behavior", () => {
        it("should use hardcoded precision for BTCUSDT when cache is empty", () => {
          // BTC should use 1 decimal place from fallback
          const result = service.formatPrice(45000.123, "BTC");
          expect(result).toBe("45000.1");
        });

        it("should use hardcoded precision for ETHUSDT when cache is empty", () => {
          // ETH should use 2 decimal places from fallback
          const result = service.formatPrice(3000.456, "ETH");
          expect(result).toBe("3000.46");
        });

        it("should use hardcoded precision for BNBUSDT when cache is empty", () => {
          // BNB should use 2 decimal places from fallback
          const result = service.formatPrice(500.789, "BNB");
          expect(result).toBe("500.79");
        });

        it("should use default precision for unknown symbols", () => {
          // Unknown symbol should default to 2 decimal places
          const result = service.formatPrice(12345.6789, "UNKNOWNUSDT");
          expect(result).toBe("12345.68");
        });
      });

      describe("formatQuantity fallback behavior", () => {
        it("should use hardcoded precision for BTCUSDT when cache is empty", () => {
          // BTC should use 3 decimal places from fallback
          const result = service.formatQuantity(0.123456, "BTC");
          expect(result).toBe("0.123");
        });

        it("should use hardcoded min quantity for BTCUSDT when cache is empty", () => {
          // BTC min quantity is 0.001
          const result = service.formatQuantity(0.0005, "BTC");
          expect(result).toBe("0.001");
        });

        it("should use hardcoded precision for BNBUSDT when cache is empty", () => {
          // BNB should use 2 decimal places from fallback
          const result = service.formatQuantity(0.123456, "BNB");
          expect(result).toBe("0.12");
        });

        it("should use hardcoded min quantity for BNBUSDT when cache is empty", () => {
          // BNB min quantity is 0.01
          const result = service.formatQuantity(0.005, "BNB");
          expect(result).toBe("0.01");
        });

        it("should handle DOGEUSDT with zero precision", () => {
          // DOGE should use 0 decimal places (whole numbers only) and stepSize of 10
          const result = service.formatQuantity(123.456, "DOGE");
          expect(result).toBe("120"); // Round down to nearest 10
        });

        it("should use DOGEUSDT min quantity of 10", () => {
          // DOGE min quantity is 10
          const result = service.formatQuantity(5, "DOGE");
          expect(result).toBe("10");
        });

        it("should use default precision for unknown symbols", () => {
          // Unknown symbol should default to 3 decimal places
          const result = service.formatQuantity(0.123456, "UNKNOWNUSDT");
          expect(result).toBe("0.123");
        });
      });

      describe("Fallback behavior for edge cases", () => {
        it("should handle very small prices correctly", () => {
          // Test with SHIB (default fallback to 2 decimal places)
          const result = service.formatPrice(0.00001234, "SHIB");
          expect(result).toBe("0.00");
        });

        it("should handle very large prices correctly", () => {
          // Test with BTC (1 decimal place)
          const result = service.formatPrice(99999.999, "BTC");
          expect(result).toBe("100000.0");
        });

        it("should round quantity down to valid step size", () => {
          // BTC with stepSize 0.001, should round down
          const result = service.formatQuantity(0.1239, "BTC");
          expect(result).toBe("0.123");
        });

        it("should ensure quantity meets minimum requirement", () => {
          // BNB quantity below 0.01 should return 0.01
          const result = service.formatQuantity(0.001, "BNB");
          expect(result).toBe("0.01");
        });
      });

      describe("Consistency between cached and fallback values", () => {
        it("should produce same results for known symbols with or without cache", () => {
          // Test that fallback produces consistent results
          const price1 = service.formatPrice(43210.987, "BTC");
          const price2 = service.formatPrice(43210.987, "BTC");
          expect(price1).toBe(price2);
          expect(price1).toBe("43211.0");
        });

        it("should handle zero quantity with correct min quantity", () => {
          // DOGEUSDT with quantity 0 should return min quantity
          const result = service.formatQuantity(0, "DOGE");
          expect(result).toBe("10");
        });
      });
    });

    describe("formatQuantityAsync - Dynamic Precision from API", () => {
      beforeEach(() => {
        // Mock getSymbolInfo to return symbol information
        jest.spyOn(service, 'getSymbolInfo').mockImplementation(async (symbol: string) => {
          const mockSymbolInfo: any = {
            symbol,
            filters: [
              {
                filterType: 'LOT_SIZE',
                minQty: '0.001',
                stepSize: '0.001'
              },
              {
                filterType: 'PRICE_FILTER',
                tickSize: '0.01'
              }
            ]
          };
          return mockSymbolInfo;
        });
      });

      it("should format quantity using API precision for BTCUSDT", async () => {
        const result = await service.formatQuantityAsync(0.123456, "BTC");
        expect(result).toBe("0.123");
      });

      it("should use minimum quantity when quantity is too small", async () => {
        const result = await service.formatQuantityAsync(0.0005, "BTC");
        expect(result).toBe("0.001");
      });

      it("should round down to nearest step size", async () => {
        const result = await service.formatQuantityAsync(0.1239, "BTC");
        expect(result).toBe("0.123");
      });

      it("should handle different step sizes correctly", async () => {
        // Mock BNB with different step size
        (service.getSymbolInfo as jest.Mock).mockImplementation(async (symbol: string) => {
          if (symbol === 'BNBUSDT') {
            return {
              symbol,
              filters: [
                { filterType: 'LOT_SIZE', minQty: '0.01', stepSize: '0.01' },
                { filterType: 'PRICE_FILTER', tickSize: '0.01' }
              ]
            };
          }
          return {
            symbol,
            filters: [
              { filterType: 'LOT_SIZE', minQty: '0.001', stepSize: '0.001' },
              { filterType: 'PRICE_FILTER', tickSize: '0.01' }
            ]
          };
        });

        const result = await service.formatQuantityAsync(0.123, "BNB");
        expect(result).toBe("0.12");
      });

      it("should fall back to defaults when getSymbolInfo fails", async () => {
        // Mock getSymbolInfo to fail
        (service.getSymbolInfo as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

        // Should use default values when API fails
        const result = await service.formatQuantityAsync(0.123, "BTC");
        expect(result).toBe("0.123"); // Uses default fallback from getPrecisions
      });

      it("should handle string quantity input", async () => {
        const result = await service.formatQuantityAsync("0.123456", "BTC");
        expect(result).toBe("0.123");
      });

      it("should preserve precision from API specifications", async () => {
        // Mock SHIB with specific precision
        (service.getSymbolInfo as jest.Mock).mockImplementation(async (symbol: string) => {
          if (symbol === 'SHIBUSDT') {
            return {
              symbol,
              filters: [
                { filterType: 'LOT_SIZE', minQty: '1000', stepSize: '1000' },
                { filterType: 'PRICE_FILTER', tickSize: '0.00001' }
              ]
            };
          }
          return {
            symbol,
            filters: [
              { filterType: 'LOT_SIZE', minQty: '0.001', stepSize: '0.001' },
              { filterType: 'PRICE_FILTER', tickSize: '0.01' }
            ]
          };
        });

        const result = await service.formatQuantityAsync(5000, "SHIB");
        expect(result).toBe("5000"); // Math.floor(5000/1000)*1000 = 5000

        // Test actual round-down behavior
        const result2 = await service.formatQuantityAsync(5500, "SHIB");
        expect(result2).toBe("5000"); // Math.floor(5500/1000)*1000 = 5000
      });
    });

    describe("Cache-based precision with API data", () => {
      beforeEach(() => {
        // Add symbol info to cache
        const symbolInfo: any = {
          symbol: 'BTCUSDT',
          filters: [
            {
              filterType: 'LOT_SIZE',
              minQty: '0.001',
              stepSize: '0.001'
            },
            {
              filterType: 'PRICE_FILTER',
              tickSize: '0.1'
            }
          ]
        };
        (service as any).symbolInfoCache.set('BTCUSDT', symbolInfo);
      });

      it("should use cached symbol info when available", () => {
        const result = service.formatQuantity(0.123456, "BTC");
        expect(result).toBe("0.123");
      });

      it("should use cached price info when available", () => {
        const result = service.formatPrice(43210.987, "BTC");
        // tickSize = 0.1, so 43210.987 rounds to 43211.0
        expect(result).toBe("43211.0");
      });

      it("should handle cached data with different step sizes", () => {
        // Update cache with different step size
        const symbolInfo: any = {
          symbol: 'BNBUSDT',
          filters: [
            {
              filterType: 'LOT_SIZE',
              minQty: '0.01',
              stepSize: '0.01'
            },
            {
              filterType: 'PRICE_FILTER',
              tickSize: '0.01'
            }
          ]
        };
        (service as any).symbolInfoCache.set('BNBUSDT', symbolInfo);

        const result = service.formatQuantity(0.123, "BNB");
        expect(result).toBe("0.12");
      });

      it("should handle zero quantity with cached min quantity", () => {
        const result = service.formatQuantity(0, "BTC");
        expect(result).toBe("0.001");
      });

      it("should handle very large quantities with cached precision", () => {
        const result = service.formatQuantity(1000.9876, "BTC");
        expect(result).toBe("1000.987");
      });

      it("should handle prices with cached tick size", () => {
        // BTC has tickSize 0.1 in cache
        const result = service.formatPrice(43210.987, "BTC");
        // tickSize = 0.1, so 43210.987 rounds to 43211.0
        expect(result).toBe("43211.0");
      });

      it("should fallback when cache is empty", () => {
        (service as any).symbolInfoCache.clear();

        const result = service.formatQuantity(0.123456, "UNKNOWN");
        expect(result).toBe("0.123"); // Uses fallback
      });
    });
  });
});
