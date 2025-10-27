import { MessageFormatService, TradeNotificationData } from '../../utils/message-format';

describe('MessageFormatService', () => {
  let messageFormatService: MessageFormatService;

  beforeEach(() => {
    messageFormatService = new MessageFormatService();
  });

  describe('formatTradeMessage', () => {
    it('should format BUY trade message with Markdown correctly', () => {
      const data: TradeNotificationData = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '1.5',
        price: '50000.00',
        orderId: '123456',
        status: 'FILLED',
        leverage: 10,
        marginType: 'ISOLATED'
      };

      const message = messageFormatService.formatTradeMessage(data);

      expect(message).toContain('✅');
      expect(message).toContain('*Trade Executed*');
      expect(message).toContain('📈');
      expect(message).toContain('*LONG*');
      expect(message).toContain('BTCUSDT');
      expect(message).toContain('💰');
      expect(message).toContain('*Quantity:* 1.5');
      expect(message).toContain('💵');
      expect(message).toContain('*Price:* 50000.00');
      expect(message).toContain('🆔');
      expect(message).toContain('*Order ID:* 123456');
      expect(message).toContain('📊');
      expect(message).toContain('*Status:* FILLED');
      expect(message).toContain('⚡');
      expect(message).toContain('*Leverage:* 10x');
      expect(message).toContain('🔒 Isolated');
      
      // Check Markdown format (not HTML)
      expect(message).not.toContain('<b>');
      expect(message).not.toContain('</b>');
      expect(message).toContain('*LONG*'); // Markdown bold
    });

    it('should format SELL trade message correctly', () => {
      const data: TradeNotificationData = {
        symbol: 'ETHUSDT',
        side: 'SELL',
        quantity: '2.0',
        price: '3000.00',
        orderId: '789012',
        status: 'FILLED'
      };

      const message = messageFormatService.formatTradeMessage(data);

      expect(message).toContain('✅');
      expect(message).toContain('*Trade Executed*');
      expect(message).toContain('📉');
      expect(message).toContain('*SHORT*');
      expect(message).toContain('ETHUSDT');
      expect(message).toContain('💰');
      expect(message).toContain('*Quantity:* 2.0');
      expect(message).toContain('💵');
      expect(message).toContain('*Price:* 3000.00');
      expect(message).toContain('🆔');
      expect(message).toContain('*Order ID:* 789012');
      expect(message).toContain('📊');
      expect(message).toContain('*Status:* FILLED');
      
      // Check Markdown format
      expect(message).not.toContain('<b>');
      expect(message).toContain('*SHORT*');
    });

    it('should include leverage when provided', () => {
      const data: TradeNotificationData = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '1.0',
        price: '50000.00',
        orderId: '123',
        status: 'FILLED',
        leverage: 25
      };

      const message = messageFormatService.formatTradeMessage(data);

      expect(message).toContain('⚡');
      expect(message).toContain('*Leverage:* 25x');
      
      // Check Markdown format
      expect(message).toContain('*Leverage:*');
    });

    it('should not include leverage when not provided', () => {
      const data: TradeNotificationData = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '1.0',
        price: '50000.00',
        orderId: '123',
        status: 'FILLED'
      };

      const message = messageFormatService.formatTradeMessage(data);

      expect(message).not.toContain('⚡');
      expect(message).not.toContain('Leverage');
    });

    it('should include isolated margin type', () => {
      const data: TradeNotificationData = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '1.0',
        price: '50000.00',
        orderId: '123',
        status: 'FILLED',
        marginType: 'ISOLATED'
      };

      const message = messageFormatService.formatTradeMessage(data);

      expect(message).toContain('🔒 Isolated');
    });

    it('should include cross margin type', () => {
      const data: TradeNotificationData = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '1.0',
        price: '50000.00',
        orderId: '123',
        status: 'FILLED',
        marginType: 'CROSSED'
      };

      const message = messageFormatService.formatTradeMessage(data);

      expect(message).toContain('🔄 Cross');
    });

    it('should not include margin type when not provided', () => {
      const data: TradeNotificationData = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '1.0',
        price: '50000.00',
        orderId: '123',
        status: 'FILLED'
      };

      const message = messageFormatService.formatTradeMessage(data);

      expect(message).not.toContain('🔒');
      expect(message).not.toContain('🔄');
    });

    it('should handle all fields with different values', () => {
      const data: TradeNotificationData = {
        symbol: 'ADAUSDT',
        side: 'SELL',
        quantity: '1000',
        price: '0.50',
        orderId: '999888',
        status: 'PARTIALLY_FILLED',
        leverage: 5,
        marginType: 'CROSSED'
      };

      const message = messageFormatService.formatTradeMessage(data);

      expect(message).toContain('ADAUSDT');
      expect(message).toContain('*SHORT*');
      expect(message).toContain('*Quantity:* 1000');
      expect(message).toContain('*Price:* 0.50');
      expect(message).toContain('*Order ID:* 999888');
      expect(message).toContain('*Status:* PARTIALLY_FILLED');
      expect(message).toContain('*Leverage:* 5x');
      expect(message).toContain('🔄 Cross');
      
      // All bold text should be in Markdown format
      expect(message).not.toContain('<b>');
      expect(message.match(/\*.*?\*/g)).toBeTruthy(); // Should contain Markdown bold
    });

    it('should use Markdown bold formatting instead of HTML', () => {
      const data: TradeNotificationData = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '1',
        price: '100',
        orderId: '123',
        status: 'FILLED'
      };

      const message = messageFormatService.formatTradeMessage(data);

      // Should contain Markdown bold
      expect(message).toContain('*Trade Executed*');
      expect(message).toContain('*LONG*');
      expect(message).toContain('*Quantity:*');
      expect(message).toContain('*Price:*');
      expect(message).toContain('*Order ID:*');
      expect(message).toContain('*Status:*');
      
      // Should NOT contain HTML
      expect(message).not.toContain('<b>');
      expect(message).not.toContain('</b>');
      expect(message).not.toContain('<strong>');
    });
  });

  describe('formatStopOrderMessage', () => {
    it('should format take profit order message correctly', () => {
      const message = messageFormatService.formatStopOrderMessage(
        'take_profit',
        'BTCUSDT',
        '55000.00',
        'tp123'
      );

      expect(message).toContain('🎯');
      expect(message).toContain('*Take Profit Order Set*');
      expect(message).toContain('📊');
      expect(message).toContain('*Symbol:* BTCUSDT');
      expect(message).toContain('💵');
      expect(message).toContain('*Price:* 55000.00');
      expect(message).toContain('🆔');
      expect(message).toContain('*Order ID:* tp123');
      
      // Check Markdown format
      expect(message).not.toContain('<b>');
      expect(message).toContain('*Take Profit Order Set*');
    });

    it('should format stop loss order message correctly', () => {
      const message = messageFormatService.formatStopOrderMessage(
        'stop_loss',
        'ETHUSDT',
        '2800.00',
        'sl456'
      );

      expect(message).toContain('🛡️');
      expect(message).toContain('*Stop Loss Order Set*');
      expect(message).toContain('📊');
      expect(message).toContain('*Symbol:* ETHUSDT');
      expect(message).toContain('💵');
      expect(message).toContain('*Price:* 2800.00');
      expect(message).toContain('🆔');
      expect(message).toContain('*Order ID:* sl456');
      
      // Check Markdown format
      expect(message).not.toContain('<b>');
    });

    it('should handle different symbols and prices', () => {
      const message = messageFormatService.formatStopOrderMessage(
        'take_profit',
        'ADAUSDT',
        '0.75',
        'tp789'
      );

      expect(message).toContain('ADAUSDT');
      expect(message).toContain('*Price:* 0.75');
      expect(message).toContain('*Order ID:* tp789');
    });

    it('should use Markdown formatting for stop orders', () => {
      const message = messageFormatService.formatStopOrderMessage(
        'take_profit',
        'BTCUSDT',
        '100',
        'order123'
      );

      // Should contain Markdown bold
      expect(message).toContain('*Take Profit Order Set*');
      expect(message).toContain('*Symbol:*');
      expect(message).toContain('*Price:*');
      expect(message).toContain('*Order ID:*');
      
      // Should NOT contain HTML
      expect(message).not.toContain('<b>');
      expect(message).not.toContain('</b>');
    });
  });

  describe('Markdown formatting validation', () => {
    it('should ensure all bold text uses Markdown syntax', () => {
      const data: TradeNotificationData = {
        symbol: 'TEST',
        side: 'BUY',
        quantity: '1',
        price: '100',
        orderId: '123',
        status: 'FILLED',
        leverage: 10,
        marginType: 'ISOLATED'
      };

      const message = messageFormatService.formatTradeMessage(data);
      
      // Check that Markdown bold pattern exists
      const markdownBoldPattern = /\*[^*]+\*/g;
      const boldMatches = message.match(markdownBoldPattern);
      
      expect(boldMatches).toBeTruthy();
      expect(boldMatches!.length).toBeGreaterThan(5); // Should have multiple bold sections
      
      // Should not have HTML tags
      expect(message).not.toMatch(/<[^>]+>/g);
    });

    it('should handle special characters in prices', () => {
      const data: TradeNotificationData = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '1.5',
        price: '45,000.00',
        orderId: '123',
        status: 'FILLED'
      };

      const message = messageFormatService.formatTradeMessage(data);
      
      expect(message).toContain('45,000.00');
      expect(message).not.toContain('<');
      expect(message).not.toContain('>');
    });

    it('should preserve newlines in message', () => {
      const data: TradeNotificationData = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '1',
        price: '100',
        orderId: '123',
        status: 'FILLED'
      };

      const message = messageFormatService.formatTradeMessage(data);
      
      // Should contain newlines between sections
      expect(message).toContain('\n');
      const lines = message.split('\n');
      expect(lines.length).toBeGreaterThan(5); // Multiple lines
    });
  });

  describe('Cross-platform compatibility', () => {
    it('should produce messages compatible with both Telegram and Slack', () => {
      const data: TradeNotificationData = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: '0.1',
        price: '45000',
        orderId: 'TEST',
        status: 'FILLED',
        leverage: 10,
        marginType: 'ISOLATED'
      };

      const message = messageFormatService.formatTradeMessage(data);
      
      // Should work with Markdown (both platforms support)
      expect(message).toContain('*');
      expect(message).not.toContain('<b>');
      expect(message).not.toContain('</b>');
      
      // Should contain emoji (supported by both)
      expect(message).toMatch(/[✅📈💰💵🆔📊⚡🔒]/);
    });
  });
});

