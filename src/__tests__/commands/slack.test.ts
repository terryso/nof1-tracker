import { handleSlackCommand } from '../../commands/slack';
import { ConfigManager } from '../../services/config-manager';
import { SlackService } from '../../services/slack-service';
import { MessageFormatService } from '../../utils/message-format';

// Mock dependencies
jest.mock('../../services/config-manager');
jest.mock('../../services/slack-service');
jest.mock('../../utils/message-format');

describe('Slack Command Handler', () => {
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let mockSlackService: jest.Mocked<SlackService>;
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
      slack: {
        enabled: false,
        token: '',
        channel: '',
      },
    });

    (ConfigManager as jest.MockedClass<typeof ConfigManager>).mockImplementation(() => mockConfigManager);

    // Mock SlackService
    mockSlackService = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
    } as any;

    (SlackService as jest.MockedClass<typeof SlackService>).mockImplementation(() => mockSlackService);

    // Mock MessageFormatService - will be recreated in each test
    mockMessageFormatService = {
      formatTradeMessage: jest.fn().mockReturnValue('Formatted test message'),
    } as any;
    
    (MessageFormatService as jest.MockedClass<typeof MessageFormatService>).mockImplementation(() => ({
      formatTradeMessage: jest.fn().mockReturnValue('Formatted test message'),
    } as any));
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('when slack is disabled', () => {
    it('should log error and not send message', async () => {
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        defaultPriceTolerance: 1.0,
        symbolTolerances: {},
        telegram: {
          enabled: false,
          token: '',
          chatId: '',
        },
        slack: {
          enabled: false,
          token: 'test-token',
          channel: 'new-channel',
        },
      });

      await handleSlackCommand({} as any);

      expect(consoleLogSpy).toHaveBeenCalledWith('❌ Slack notifications are not enabled in your configuration. Set SLACK_ENABLED=true in your .env file.');
      expect(SlackService).not.toHaveBeenCalled();
    });
  });

  describe('when token is missing', () => {
    it('should log error and not send message', async () => {
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        defaultPriceTolerance: 1.0,
        symbolTolerances: {},
        telegram: {
          enabled: false,
          token: '',
          chatId: '',
        },
        slack: {
          enabled: true,
          token: '',
          channel: 'new-channel',
        },
      });

      await handleSlackCommand({} as any);

      expect(consoleLogSpy).toHaveBeenCalledWith('❌ Slack API Token is not set. Please set SLACK_OAUTH_TOKEN in your .env file.');
      expect(SlackService).not.toHaveBeenCalled();
    });
  });

  describe('when channel is missing', () => {
    it('should log error and not send message', async () => {
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        defaultPriceTolerance: 1.0,
        symbolTolerances: {},
        telegram: {
          enabled: false,
          token: '',
          chatId: '',
        },
        slack: {
          enabled: true,
          token: 'test-token',
          channel: '',
        },
      });

      await handleSlackCommand({} as any);

      expect(consoleLogSpy).toHaveBeenCalledWith('❌ Slack Channel is not set. Please set SLACK_CHANNEL_NAME in your .env file.');
      expect(SlackService).not.toHaveBeenCalled();
    });
  });

  describe('when configuration is valid', () => {
    it('should send test trade message successfully', async () => {
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        defaultPriceTolerance: 1.0,
        symbolTolerances: {},
        telegram: {
          enabled: false,
          token: '',
          chatId: '',
        },
        slack: {
          enabled: true,
          token: 'xoxb-test-token-123',
          channel: 'new-channel',
        },
      });

      await handleSlackCommand({} as any);

      expect(consoleLogSpy).toHaveBeenCalledWith('🚀 Attempting to send a test Slack message...');
      expect(ConfigManager).toHaveBeenCalled();
      expect(mockConfigManager.loadFromEnvironment).toHaveBeenCalled();
      expect(SlackService).toHaveBeenCalledWith('xoxb-test-token-123');
      expect(MessageFormatService).toHaveBeenCalled();
      expect(mockSlackService.sendMessage).toHaveBeenCalledWith(
        'new-channel',
        'Formatted test message'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Test Slack message sent successfully!');
    });

    it('should handle send message failure', async () => {
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        defaultPriceTolerance: 1.0,
        symbolTolerances: {},
        telegram: {
          enabled: false,
          token: '',
          chatId: '',
        },
        slack: {
          enabled: true,
          token: 'xoxb-test-token-123',
          channel: 'new-channel',
        },
      });

      const error = new Error('Slack API error: not_in_channel');
      mockSlackService.sendMessage.mockRejectedValueOnce(error);

      await handleSlackCommand({} as any);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Failed to send test Slack message:', 'Slack API error: not_in_channel');
    });

    it('should handle different error types', async () => {
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        defaultPriceTolerance: 1.0,
        symbolTolerances: {},
        telegram: {
          enabled: false,
          token: '',
          chatId: '',
        },
        slack: {
          enabled: true,
          token: 'xoxb-test-token-123',
          channel: 'new-channel',
        },
      });

      mockSlackService.sendMessage.mockRejectedValueOnce('String error');

      await handleSlackCommand({} as any);

      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Failed to send test Slack message:', 'String error');
    });
  });

  describe('config loading', () => {
    it('should load configuration from environment', async () => {
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        defaultPriceTolerance: 1.0,
        symbolTolerances: {},
        telegram: {
          enabled: false,
          token: '',
          chatId: '',
        },
        slack: {
          enabled: true,
          token: 'test-token',
          channel: 'test-channel',
        },
      });

      await handleSlackCommand({} as any);

      expect(mockConfigManager.loadFromEnvironment).toHaveBeenCalled();
      expect(mockConfigManager.getConfig).toHaveBeenCalled();
    });
  });

  describe('slack service initialization', () => {
    it('should create SlackService with correct token', async () => {
      const testToken = 'xoxb-my-special-token-123';
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        defaultPriceTolerance: 1.0,
        symbolTolerances: {},
        telegram: {
          enabled: false,
          token: '',
          chatId: '',
        },
        slack: {
          enabled: true,
          token: testToken,
          channel: 'test-channel',
        },
      });

      await handleSlackCommand({} as any);

      expect(SlackService).toHaveBeenCalledWith(testToken);
    });
  });

  describe('message content', () => {
    it('should format and send trade message with correct parameters', async () => {
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        defaultPriceTolerance: 1.0,
        symbolTolerances: {},
        telegram: {
          enabled: false,
          token: '',
          chatId: '',
        },
        slack: {
          enabled: true,
          token: 'test-token',
          channel: 'trade-alerts',
        },
      });

      await handleSlackCommand({} as any);

      expect(MessageFormatService).toHaveBeenCalled();
      expect(mockSlackService.sendMessage).toHaveBeenCalledWith(
        'trade-alerts',
        'Formatted test message'
      );
    });
  });

  describe('trade message formatting', () => {
    it('should use MessageFormatService to format test trade', async () => {
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        defaultPriceTolerance: 1.0,
        symbolTolerances: {},
        telegram: {
          enabled: false,
          token: '',
          chatId: '',
        },
        slack: {
          enabled: true,
          token: 'test-token',
          channel: 'test-channel',
        },
      });

      await handleSlackCommand({} as any);

      expect(MessageFormatService).toHaveBeenCalled();
      expect(mockSlackService.sendMessage).toHaveBeenCalled();
    });
  });

  describe('sequential operations', () => {
    it('should call loadFromEnvironment before getConfig', async () => {
      mockConfigManager.getConfig = jest.fn().mockReturnValue({
        defaultPriceTolerance: 1.0,
        symbolTolerances: {},
        telegram: {
          enabled: false,
          token: '',
          chatId: '',
        },
        slack: {
          enabled: true,
          token: 'test-token',
          channel: 'test-channel',
        },
      });

      await handleSlackCommand({} as any);

      // Verify both methods were called
      expect(mockConfigManager.loadFromEnvironment).toHaveBeenCalled();
      expect(mockConfigManager.getConfig).toHaveBeenCalled();
      
      // Verify getConfig was called after loadFromEnvironment
      const loadEnvOrder = (mockConfigManager.loadFromEnvironment as jest.Mock).mock.invocationCallOrder[0];
      const getConfigOrder = (mockConfigManager.getConfig as jest.Mock).mock.invocationCallOrder[0];
      expect(getConfigOrder).toBeGreaterThan(loadEnvOrder);
    });
  });
});

