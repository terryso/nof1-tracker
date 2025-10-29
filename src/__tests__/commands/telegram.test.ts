import { handleTelegramCommand } from '../../commands/telegram';
import { ConfigManager } from '../../services/config-manager';
import { TelegramService } from '../../services/telegram-service';
import { MessageFormatService } from '../../utils/message-format';

// Mock dependencies
jest.mock('../../services/config-manager');
jest.mock('../../services/telegram-service');
jest.mock('../../utils/message-format');

describe('Telegram Command Handler', () => {
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let mockTelegramService: jest.Mocked<TelegramService>;
  let mockMessageFormatService: jest.Mocked<MessageFormatService>;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Mock ConfigManager
    mockConfigManager = new ConfigManager() as jest.Mocked<ConfigManager>;
    mockConfigManager.loadFromEnvironment = jest.fn();
    mockConfigManager.getConfig = jest.fn().mockReturnValue({
      defaultPriceTolerance: 1.0,
      symbolTolerances: {},
      telegram: {
        enabled: false,
        token: '',
        chatId: '',
      },
    });

    (ConfigManager as jest.MockedClass<typeof ConfigManager>).mockImplementation(() => mockConfigManager);

    // Mock TelegramService
    mockTelegramService = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
    } as any;

    (TelegramService as jest.MockedClass<typeof TelegramService>).mockImplementation(() => mockTelegramService);

    // Mock MessageFormatService
    mockMessageFormatService = {
      formatTradeMessage: jest.fn().mockReturnValue('Formatted test trade message'),
    } as any;

    (MessageFormatService as jest.MockedClass<typeof MessageFormatService>).mockImplementation(() => mockMessageFormatService);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('when telegram is disabled', () => {
    it('should log error and not send message', async () => {
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        defaultPriceTolerance: 1.0,
        symbolTolerances: {},
        telegram: {
          enabled: false,
          token: 'test-token',
          chatId: '123',
        },
      });

      await handleTelegramCommand({} as any);

      expect(consoleLogSpy).toHaveBeenCalledWith('❌ Telegram notifications are not enabled in your configuration. Set TELEGRAM_ENABLED=true in your .env file.');
      expect(TelegramService).not.toHaveBeenCalled();
    });
  });

  describe('when token is missing', () => {
    it('should log error and not send message', async () => {
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        defaultPriceTolerance: 1.0,
        symbolTolerances: {},
        telegram: {
          enabled: true,
          token: '',
          chatId: '123',
        },
      });

      await handleTelegramCommand({} as any);

      expect(consoleLogSpy).toHaveBeenCalledWith('❌ Telegram API Token is not set. Please set TELEGRAM_API_TOKEN in your .env file.');
      expect(TelegramService).not.toHaveBeenCalled();
    });
  });

  describe('when chatId is missing', () => {
    it('should log error and not send message', async () => {
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        defaultPriceTolerance: 1.0,
        symbolTolerances: {},
        telegram: {
          enabled: true,
          token: 'test-token',
          chatId: '',
        },
      });

      await handleTelegramCommand({} as any);

      expect(consoleLogSpy).toHaveBeenCalledWith('❌ Telegram Chat ID is not set. Please set TELEGRAM_CHAT_ID in your .env file.');
      expect(TelegramService).not.toHaveBeenCalled();
    });
  });

  describe('when configuration is valid', () => {
    it('should send test message successfully', async () => {
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        defaultPriceTolerance: 1.0,
        symbolTolerances: {},
        telegram: {
          enabled: true,
          token: 'test-token-123',
          chatId: '123456789',
        },
      });

      await handleTelegramCommand({} as any);

      expect(consoleLogSpy).toHaveBeenCalledWith('🚀 Attempting to send a test Telegram message...');
      expect(ConfigManager).toHaveBeenCalled();
      expect(mockConfigManager.loadFromEnvironment).toHaveBeenCalled();
      expect(TelegramService).toHaveBeenCalledWith('test-token-123');
      expect(MessageFormatService).toHaveBeenCalled();
      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        '123456789',
        'Formatted test trade message'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Test Telegram message sent successfully!');
    });

    it('should handle send message failure', async () => {
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        defaultPriceTolerance: 1.0,
        symbolTolerances: {},
        telegram: {
          enabled: true,
          token: 'test-token-123',
          chatId: '123456789',
        },
      });

      const error = new Error('Network error');
      mockTelegramService.sendMessage.mockRejectedValueOnce(error);

      await handleTelegramCommand({} as any);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Failed to send test Telegram message:', 'Network error');
    });

    it('should handle different error types', async () => {
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        defaultPriceTolerance: 1.0,
        symbolTolerances: {},
        telegram: {
          enabled: true,
          token: 'test-token-123',
          chatId: '123456789',
        },
      });

      mockTelegramService.sendMessage.mockRejectedValueOnce('String error');

      await handleTelegramCommand({} as any);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Failed to send test Telegram message:', 'String error');
    });
  });

  describe('config loading', () => {
    it('should load configuration from environment', async () => {
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        defaultPriceTolerance: 1.0,
        symbolTolerances: {},
        telegram: {
          enabled: true,
          token: 'test-token',
          chatId: '123',
        },
      });

      await handleTelegramCommand({} as any);

      expect(mockConfigManager.loadFromEnvironment).toHaveBeenCalled();
      expect(mockConfigManager.getConfig).toHaveBeenCalled();
    });
  });

  describe('telegram service initialization', () => {
    it('should create TelegramService with correct token', async () => {
      const testToken = 'my-special-token';
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        defaultPriceTolerance: 1.0,
        symbolTolerances: {},
        telegram: {
          enabled: true,
          token: testToken,
          chatId: '123',
        },
      });

      await handleTelegramCommand({} as any);

      expect(TelegramService).toHaveBeenCalledWith(testToken);
    });
  });

  describe('message content', () => {
    it('should send the correct test message', async () => {
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        defaultPriceTolerance: 1.0,
        symbolTolerances: {},
        telegram: {
          enabled: true,
          token: 'test-token',
          chatId: 'chat123',
        },
      });

      await handleTelegramCommand({} as any);

      expect(mockTelegramService.sendMessage).toHaveBeenCalledWith(
        'chat123',
        'Formatted test trade message'
      );
    });
  });
});

