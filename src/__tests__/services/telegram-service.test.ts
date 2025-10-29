import { TelegramService } from '../../services/telegram-service';
import TelegramBot from 'node-telegram-bot-api';

// Mock node-telegram-bot-api
jest.mock('node-telegram-bot-api');

describe('TelegramService', () => {
  let telegramService: TelegramService;
  let mockBot: jest.Mocked<TelegramBot>;
  const mockToken = 'test-token-123';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create a mock bot instance
    mockBot = {
      sendMessage: jest.fn().mockResolvedValue({ message_id: 1 }),
    } as any;

    // Mock the TelegramBot constructor
    (TelegramBot as jest.MockedClass<typeof TelegramBot>).mockImplementation(() => mockBot);

    // Create the service instance
    telegramService = new TelegramService(mockToken);
  });

  describe('Constructor', () => {
    it('should create TelegramService instance with token', () => {
      expect(telegramService).toBeInstanceOf(TelegramService);
      expect(TelegramBot).toHaveBeenCalledWith(mockToken, { polling: false });
    });

    it('should initialize TelegramBot with correct options', () => {
      new TelegramService('another-token');
      expect(TelegramBot).toHaveBeenCalledWith('another-token', { polling: false });
    });
  });

  describe('sendMessage', () => {
    const chatId = '123456789';
    const testMessage = 'Test message';

    it('should send message successfully', async () => {
      await telegramService.sendMessage(chatId, testMessage);

      expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId, testMessage, { parse_mode: 'Markdown' });
    });

    it('should throw error when message sending fails', async () => {
      const error = new Error('Network error');
      mockBot.sendMessage.mockRejectedValueOnce(error);

      await expect(telegramService.sendMessage(chatId, testMessage)).rejects.toThrow('Network error');
      expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId, testMessage, { parse_mode: 'Markdown' });
    });

    it('should handle different chat IDs', async () => {
      const chatId1 = '111111111';
      const chatId2 = '222222222';

      await telegramService.sendMessage(chatId1, testMessage);
      await telegramService.sendMessage(chatId2, testMessage);

      expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId1, testMessage, { parse_mode: 'Markdown' });
      expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId2, testMessage, { parse_mode: 'Markdown' });
      expect(mockBot.sendMessage).toHaveBeenCalledTimes(2);
    });

    it('should send different message types', async () => {
      const message1 = 'First message';
      const message2 = 'Second message';

      await telegramService.sendMessage(chatId, message1);
      await telegramService.sendMessage(chatId, message2);

      expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId, message1, { parse_mode: 'Markdown' });
      expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId, message2, { parse_mode: 'Markdown' });
    });

    it('should send Markdown formatted messages', async () => {
      const markdownMessage = '*Trade Executed*\n\n📈 *LONG* BTCUSDT';

      await telegramService.sendMessage(chatId, markdownMessage);

      expect(mockBot.sendMessage).toHaveBeenCalledWith(chatId, markdownMessage, { parse_mode: 'Markdown' });
    });
  });

  describe('Error handling in console', () => {
    let consoleErrorSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should log error when sending message fails', async () => {
      const error = new Error('Connection failed');
      mockBot.sendMessage.mockRejectedValueOnce(error);

      await expect(telegramService.sendMessage('123', 'test')).rejects.toThrow('Connection failed');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error sending message to Telegram:', error);
    });

    it('should log when sending message starts', async () => {
      await telegramService.sendMessage('123', 'test');

      expect(consoleLogSpy).toHaveBeenCalledWith('Sending message to Telegram...');
    });
  });

  describe('multiple service instances', () => {
    it('should create independent service instances', async () => {
      const service1 = new TelegramService('token1');
      const service2 = new TelegramService('token2');

      await service1.sendMessage('chat1', 'message1');
      await service2.sendMessage('chat2', 'message2');

      expect(TelegramBot).toHaveBeenCalledTimes(3); // 1 for telegramService, 1 for service1, 1 for service2
    });
  });
});
