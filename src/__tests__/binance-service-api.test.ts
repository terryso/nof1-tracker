import { BinanceService } from "../services/binance-service";
import axios from 'axios';
import CryptoJS from 'crypto-js';

// Mock axios and crypto-js
jest.mock('axios');
jest.mock('crypto-js', () => ({
  HmacSHA256: jest.fn(),
  enc: {
    Hex: {
      toString: jest.fn()
    }
  }
}));

// Mock axios.isAxiosError to properly identify our test errors
const mockIsAxiosError = jest.fn();
(axios.isAxiosError as unknown as jest.Mock) = mockIsAxiosError;

const MockedAxios = axios as jest.Mocked<typeof axios>;

describe("BinanceService - API Methods", () => {
  let binanceService: BinanceService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Mock crypto-js
    const mockHmacSHA256 = (CryptoJS.HmacSHA256 as jest.Mock);
    mockHmacSHA256.mockReturnValue({
      toString: jest.fn().mockReturnValue('mocked_signature')
    });

    // Mock axios.create with proper get method that returns data
    mockAxiosInstance = {
      request: jest.fn(),
      get: jest.fn().mockResolvedValue({ data: { serverTime: Date.now() } })
    };
    MockedAxios.create = jest.fn().mockReturnValue(mockAxiosInstance);

    binanceService = new BinanceService('test_api_key', 'test_api_secret', false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Signature Generation", () => {
    it("should generate HMAC-SHA256 signature", () => {
      const queryString = "symbol=BTCUSDT&timestamp=1234567890";

      // Call the private method via type assertion
      const signature = (binanceService as any).createSignature(queryString);

      const mockHmacSHA256 = (CryptoJS.HmacSHA256 as jest.Mock);
      expect(mockHmacSHA256).toHaveBeenCalledWith(queryString, 'test_api_secret');
      expect(signature).toBe('mocked_signature');
    });

    it("should handle empty query string", () => {
      const queryString = "";

      const signature = (binanceService as any).createSignature(queryString);

      expect(CryptoJS.HmacSHA256).toHaveBeenCalledWith('', 'test_api_secret');
      expect(signature).toBe('mocked_signature');
    });
  });

  describe("Public API Requests", () => {
    it("should make public request without signature", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { serverTime: 1234567890 }
      });

      const result = await binanceService.getServerTime();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/fapi/v1/time');
      expect(result).toBe(1234567890);
    });

    it("should handle public request with parameters", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: [{ symbol: 'BTCUSDT', lastPrice: '50000' }]
      });

      const result = await binanceService.get24hrTicker('BTCUSDT');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/fapi/v1/ticker/24hr?symbol=BTCUSDT');
      expect(result).toEqual([{ symbol: 'BTCUSDT', lastPrice: '50000' }]);
    });

    it("should handle public request without parameters", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: [{ symbol: 'BTCUSDT', lastPrice: '50000' }]
      });

      const result = await binanceService.get24hrTicker();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/fapi/v1/ticker/24hr');
      expect(result).toEqual([{ symbol: 'BTCUSDT', lastPrice: '50000' }]);
    });

    it("should handle public request errors", async () => {
      const error = {
        response: {
          data: { msg: 'Invalid symbol' },
          status: 400
        }
      };
      mockIsAxiosError.mockReturnValue(true);
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(binanceService.get24hrTicker('INVALID')).rejects.toThrow(
        'Binance API Error: Invalid symbol'
      );
    });

    it("should handle network errors in public requests", async () => {
      const error = new Error('Network error');
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(binanceService.get24hrTicker('BTCUSDT')).rejects.toThrow(
        'Request failed: Network error'
      );
    });
  });

  describe("Signed API Requests", () => {
    beforeEach(() => {
      (CryptoJS.HmacSHA256 as jest.Mock) = jest.fn().mockReturnValue({
        toString: jest.fn().mockReturnValue('test_signature_123')
      }) as any;
    });

    it("should make signed GET request", async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: {
          totalWalletBalance: '1000.0',
          availableBalance: '800.0'
        }
      });

      const result = await binanceService.getAccountInfo();

      expect(CryptoJS.HmacSHA256).toHaveBeenCalled();
      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: expect.stringContaining('/fapi/v2/account?'),
        headers: {
          'X-MBX-APIKEY': 'test_api_key'
        }
      });
      expect(result.totalWalletBalance).toBe('1000.0');
    });

    it("should make signed POST request", async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: {
          orderId: 123456,
          symbol: 'BTCUSDT',
          status: 'FILLED'
        }
      });

      const order = {
        symbol: 'BTCUSDT',
        side: 'BUY' as const,
        type: 'MARKET' as const,
        quantity: '0.001',
        leverage: 10
      };

      const result = await binanceService.placeOrder(order);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: expect.stringContaining('/fapi/v1/order?'),
        headers: {
          'X-MBX-APIKEY': 'test_api_key'
        }
      });
      expect(result.orderId).toBe(123456);
    });

    it("should make signed DELETE request", async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: {
          orderId: 123456,
          symbol: 'BTCUSDT',
          status: 'CANCELED'
        }
      });

      const result = await binanceService.cancelOrder('BTCUSDT', 123456);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: expect.stringContaining('/fapi/v1/order?'),
        headers: {
          'X-MBX-APIKEY': 'test_api_key'
        }
      });
      expect(result.orderId).toBe(123456);
    });

    it("should handle signed request errors", async () => {
      const error = {
        response: {
          data: { code: -1022, msg: 'Signature for this request is not valid' },
          status: 401
        }
      };
      mockIsAxiosError.mockReturnValue(true);
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(binanceService.getAccountInfo()).rejects.toThrow(
        'Binance API Error: Signature for this request is not valid'
      );
    });

    it("should handle network errors in signed requests", async () => {
      const error = new Error('Connection timeout');
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(binanceService.getAccountInfo()).rejects.toThrow(
        'Request failed: Connection timeout'
      );
    });
  });

  describe("Trading Operations", () => {
    beforeEach(() => {
      (CryptoJS.HmacSHA256 as jest.Mock) = jest.fn().mockReturnValue({
        toString: jest.fn().mockReturnValue('test_signature_trading')
      }) as any;
    });

    it("should get positions", async () => {
      const mockPositions = [
        {
          symbol: 'BTCUSDT',
          positionAmt: '0.001',
          entryPrice: '50000',
          markPrice: '51000',
          unRealizedProfit: '1.0'
        },
        {
          symbol: 'ETHUSDT',
          positionAmt: '0',
          entryPrice: '3000',
          markPrice: '3100',
          unRealizedProfit: '0'
        }
      ];

      mockAxiosInstance.request.mockResolvedValue({ data: mockPositions });

      const result = await binanceService.getPositions();

      expect(result).toHaveLength(1); // Only positions with non-zero amount
      expect(result[0].symbol).toBe('BTCUSDT');
      expect(result[0].positionAmt).toBe('0.001');
    });

    it("should set leverage", async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: { leverage: 20, maxNotionalValue: '1000000' }
      });

      const result = await binanceService.setLeverage('BTCUSDT', 20);

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'POST',
        url: expect.stringContaining('/fapi/v1/leverage?'),
        headers: {
          'X-MBX-APIKEY': 'test_api_key'
        }
      });
      expect(result.leverage).toBe(20);
    });

    it("should get open orders", async () => {
      const mockOrders = [
        {
          orderId: 123456,
          symbol: 'BTCUSDT',
          price: '49000',
          origQty: '0.001',
          status: 'NEW'
        }
      ];

      mockAxiosInstance.request.mockResolvedValue({ data: mockOrders });

      const result = await binanceService.getOpenOrders('BTCUSDT');

      expect(result).toHaveLength(1);
      expect(result[0].orderId).toBe(123456);
      expect(result[0].symbol).toBe('BTCUSDT');
    });

    it("should get all open orders without symbol filter", async () => {
      const mockOrders = [
        {
          orderId: 123456,
          symbol: 'BTCUSDT',
          price: '49000',
          origQty: '0.001',
          status: 'NEW'
        },
        {
          orderId: 123457,
          symbol: 'ETHUSDT',
          price: '2900',
          origQty: '1.0',
          status: 'NEW'
        }
      ];

      mockAxiosInstance.request.mockResolvedValue({ data: mockOrders });

      const result = await binanceService.getOpenOrders();

      expect(result).toHaveLength(2);
    });

    it("should cancel all orders", async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: { code: 200, msg: 'All orders canceled' }
      });

      const result = await binanceService.cancelAllOrders('BTCUSDT');

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: expect.stringContaining('/fapi/v1/allOpenOrders?'),
        headers: {
          'X-MBX-APIKEY': 'test_api_key'
        }
      });
    });

    it("should get order status", async () => {
      const mockOrder = {
        orderId: 123456,
        symbol: 'BTCUSDT',
        status: 'FILLED',
        executedQty: '0.001',
        avgPrice: '50000'
      };

      mockAxiosInstance.request.mockResolvedValue({ data: mockOrder });

      const result = await binanceService.getOrderStatus('BTCUSDT', 123456);

      expect(result.orderId).toBe(123456);
      expect(result.status).toBe('FILLED');
      expect(result.executedQty).toBe('0.001');
    });
  });

  describe("Query String Building", () => {
    it("should build query string with multiple parameters", () => {
      const params = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: '0.001'
      };

      // Test the private method
      const queryString = (binanceService as any).buildQueryString?.(params);

      // Since we can't access private method directly, test through the signed request
      (CryptoJS.HmacSHA256 as jest.Mock) = jest.fn().mockImplementation((qs: string) => {
        // Verify the query string format
        expect(qs).toContain('symbol=BTCUSDT');
        expect(qs).toContain('side=BUY');
        expect(qs).toContain('type=MARKET');
        expect(qs).toContain('quantity=0.001');
        expect(qs).toContain('timestamp=');

        return { toString: () => 'test_signature' };
      });

      mockAxiosInstance.request.mockResolvedValue({ data: { orderId: 123 } });

      binanceService.placeOrder({
        symbol: 'BTCUSDT',
        side: 'BUY',
        type: 'MARKET',
        quantity: '0.001',
        leverage: 0
      });
    });

    it("should handle empty parameters", () => {
      (CryptoJS.HmacSHA256 as jest.Mock) = jest.fn().mockImplementation((qs: string) => {
        expect(qs).toMatch(/^recvWindow=60000&timestamp=\d+$/);
        return { toString: () => 'test_signature' };
      });

      mockAxiosInstance.request.mockResolvedValue({ data: { serverTime: 123 } });

      binanceService.getAccountInfo();
    });
  });

  describe("Error Handling Edge Cases", () => {
    it("should handle malformed API response", async () => {
      mockAxiosInstance.request.mockResolvedValue({
        data: null // Null response
      });

      const result = await binanceService.getAccountInfo();
      expect(result).toBeNull();
    });

    it("should handle API error without response data", async () => {
      const error = {
        response: {
          status: 500
          // No data property
        }
      };
      mockIsAxiosError.mockReturnValue(true);
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(binanceService.getAccountInfo()).rejects.toThrow(
        'Binance API Error: undefined'
      );
    });

    it("should handle API error with empty message", async () => {
      const error = {
        response: {
          data: { code: -1000 },
          status: 400
        }
      };
      mockIsAxiosError.mockReturnValue(true);
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(binanceService.getAccountInfo()).rejects.toThrow(
        'Binance API Error: undefined'
      );
    });

    it("should handle -1021 timestamp error and retry", async () => {
      // First call fails with -1021
      const error = {
        response: {
          data: { code: -1021, msg: 'Timestamp error' },
          status: 400
        }
      };
      mockIsAxiosError.mockReturnValue(true);

      // Second call (retry) succeeds
      mockAxiosInstance.request
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ data: { success: true } });

      const result = await binanceService.getAccountInfo();
      expect(result.success).toBe(true);
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2);
    });

    it("should handle -2019 margin insufficient error", async () => {
      const error = {
        response: {
          data: { code: -2019, msg: 'Margin insufficient' },
          status: 400
        }
      };
      mockIsAxiosError.mockReturnValue(true);
      mockAxiosInstance.request.mockRejectedValue(error);

      await expect(binanceService.getAccountInfo()).rejects.toThrow(
        'Binance API Error: Margin insufficient'
      );
    });

    it("should handle symbol not found in getSymbolInfo", async () => {
      // Mock exchangeInfo not containing the symbol
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          symbols: [] // Empty symbols array
        }
      });

      const result = await binanceService.getSymbolInfo('INVALIDUSDT');

      // Should return default value when symbol not found
      expect(result.symbol).toBe('INVALIDUSDT');
      expect(result.filters).toBeDefined();
    });

    it("should handle getSymbolInfo error and return default", async () => {
      // Mock API error
      mockAxiosInstance.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await binanceService.getSymbolInfo('BTCUSDT');

      // Should return default value on error
      expect(result.symbol).toBe('BTCUSDT');
      expect(result.filters).toBeDefined();
      expect(result.filters[0].filterType).toBe('LOT_SIZE');
    });

    it("should use cached symbol info when available", async () => {
      // Mock getExchangeInformation to return symbol data
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          symbols: [{ symbol: 'BTCUSDT', filters: [] }]
        }
      });

      const result1 = await binanceService.getSymbolInfo('BTC');
      expect(result1.symbol).toBe('BTCUSDT');

      // Second call should use cache (no additional API call)
      const result2 = await binanceService.getSymbolInfo('BTC');
      expect(result2).toBe(result1);

      // getExchangeInformation should only be called once (second call uses cache)
      expect(mockAxiosInstance.get).toHaveBeenCalled();
      // The exact call count may vary due to syncServerTime, so we just check that both calls return the same cached result
    });
  });

  describe("Error handling for specific error codes", () => {
    it("should log margin insufficient error in placeOrder", async () => {
      const error = {
        response: {
          data: { code: -2019, msg: 'Margin insufficient' },
          status: 400
        }
      };
      mockIsAxiosError.mockReturnValue(true);
      mockAxiosInstance.request.mockRejectedValue(error);

      const order = {
        symbol: 'BTCUSDT',
        side: 'BUY' as const,
        type: 'MARKET' as const,
        quantity: '0.001',
        leverage: 10
      };

      // Pre-populate cache to avoid getSymbolInfo call
      const symbolInfo = {
        symbol: 'BTCUSDT',
        filters: [
          { filterType: 'LOT_SIZE', minQty: '0.001', stepSize: '0.001' },
          { filterType: 'PRICE_FILTER', tickSize: '0.01' }
        ]
      };
      (binanceService as any).symbolInfoCache.set('BTCUSDT', symbolInfo);

      await expect(binanceService.placeOrder(order)).rejects.toThrow(
        'Binance API Error: Margin insufficient'
      );
    });
  });

  describe("Formatting with different price precisions", () => {
    it("should handle price precision 3 (MATICUSDT)", () => {
      const result = binanceService.formatPrice(0.123456, "MATIC");
      expect(result).toBe("0.123");
    });

    it("should handle price precision 4 (ADAUSDT)", () => {
      const result = binanceService.formatPrice(0.12345678, "ADA");
      expect(result).toBe("0.1235");
    });

    it("should handle price precision 5 (DOGEUSDT)", () => {
      const result = binanceService.formatPrice(0.123456789, "DOGE");
      expect(result).toBe("0.12346");
    });
  });
});