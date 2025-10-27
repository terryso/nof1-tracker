import { SlackService } from '../../services/slack-service';
import { WebClient } from '@slack/web-api';

// Mock @slack/web-api
jest.mock('@slack/web-api');

describe('SlackService', () => {
  let slackService: SlackService;
  let mockWebClient: any;
  const mockToken = 'xoxb-test-token-123';

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create a mock web client instance
    mockWebClient = {
      chat: {
        postMessage: jest.fn().mockResolvedValue({ ok: true, ts: '1234567890.123456' }),
      },
    };

    // Mock the WebClient constructor
    (WebClient as jest.MockedClass<typeof WebClient>).mockImplementation(() => mockWebClient);

    // Create the service instance
    slackService = new SlackService(mockToken);
  });

  describe('Constructor', () => {
    it('should create SlackService instance with token', () => {
      expect(slackService).toBeInstanceOf(SlackService);
      expect(WebClient).toHaveBeenCalledWith(mockToken);
    });

    it('should initialize WebClient with correct token', () => {
      const anotherToken = 'xoxb-another-token';
      new SlackService(anotherToken);
      expect(WebClient).toHaveBeenCalledWith(anotherToken);
    });
  });

  describe('sendMessage', () => {
    const channel = 'new-channel';
    const testMessage = 'Test message';

    it('should send message successfully', async () => {
      await slackService.sendMessage(channel, testMessage);

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith({
        channel: channel,
        text: testMessage,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: testMessage,
            },
          },
        ],
      });
    });

    it('should throw error when message sending fails', async () => {
      const error = new Error('Slack API error: not_in_channel');
      (mockWebClient.chat.postMessage as jest.Mock).mockRejectedValueOnce(error);

      await expect(slackService.sendMessage(channel, testMessage)).rejects.toThrow('Slack API error: not_in_channel');
      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith({
        channel: channel,
        text: testMessage,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: testMessage,
            },
          },
        ],
      });
    });

    it('should handle different channels', async () => {
      const channel1 = 'channel-1';
      const channel2 = 'channel-2';

      await slackService.sendMessage(channel1, testMessage);
      await slackService.sendMessage(channel2, testMessage);

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ channel: channel1 })
      );
      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ channel: channel2 })
      );
      expect(mockWebClient.chat.postMessage).toHaveBeenCalledTimes(2);
    });

    it('should send different message types', async () => {
      const message1 = 'First message';
      const message2 = 'Second message';

      await slackService.sendMessage(channel, message1);
      await slackService.sendMessage(channel, message2);

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: message1,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: message1,
              },
            },
          ],
        })
      );
      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: message2,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: message2,
              },
            },
          ],
        })
      );
    });

    it('should send formatted markdown message', async () => {
      const markdownMessage = '*Trade Executed*\n\n📈 *LONG* BTCUSDT';

      await slackService.sendMessage(channel, markdownMessage);

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: markdownMessage,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: markdownMessage,
              },
            },
          ],
        })
      );
    });
  });

  describe('message blocks structure', () => {
    it('should create correct block structure for messages', async () => {
      const testChannel = 'test-channel';
      const testMessage = '*Trade Executed*';
      await slackService.sendMessage(testChannel, testMessage);

      const callArgs = (mockWebClient.chat.postMessage as jest.Mock).mock.calls[0][0];
      expect(callArgs.blocks).toEqual([
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: testMessage,
          },
        },
      ]);
    });

    it('should include fallback text', async () => {
      const testChannel = 'test-channel';
      const testMessage = '*Bold text*';
      await slackService.sendMessage(testChannel, testMessage);

      const callArgs = (mockWebClient.chat.postMessage as jest.Mock).mock.calls[0][0];
      expect(callArgs.text).toBe(testMessage);
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
      (mockWebClient.chat.postMessage as jest.Mock).mockRejectedValueOnce(error);

      await expect(slackService.sendMessage('channel', 'test')).rejects.toThrow('Connection failed');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error sending message to Slack:', error);
    });

    it('should log when sending message starts', async () => {
      await slackService.sendMessage('channel', 'test');

      expect(consoleLogSpy).toHaveBeenCalledWith('Message sent to Slack successfully');
    });
  });

  describe('channel name handling', () => {
    it('should handle channel names with # prefix', async () => {
      const channelWithHash = '#new-channel';
      await slackService.sendMessage(channelWithHash, 'test message');

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ channel: channelWithHash })
      );
    });

    it('should handle plain channel names', async () => {
      const plainChannel = 'new-channel';
      await slackService.sendMessage(plainChannel, 'test message');

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({ channel: plainChannel })
      );
    });
  });

  describe('integration with different message formats', () => {
    it('should handle trade messages', async () => {
      const tradeMessage = `✅ *Trade Executed*

📈 *LONG* BTCUSDT
💰 *Quantity:* 0.1
💵 *Price:* 45,000.00`;

      await slackService.sendMessage('trading', tradeMessage);

      expect(mockWebClient.chat.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: tradeMessage,
        })
      );
    });

    it('should handle long messages', async () => {
      const longMessage = '*Header*\n\n' + 'Line '.repeat(50);
      await slackService.sendMessage('channel', longMessage);

      expect(mockWebClient.chat.postMessage).toHaveBeenCalled();
    });
  });

  describe('multiple service instances', () => {
    it('should create independent service instances', async () => {
      const service1 = new SlackService('token1');
      const service2 = new SlackService('token2');

      await service1.sendMessage('channel1', 'message1');
      await service2.sendMessage('channel2', 'message2');

      expect(WebClient).toHaveBeenCalledTimes(3); // 1 for slackService, 1 for service1, 1 for service2
    });
  });
});

