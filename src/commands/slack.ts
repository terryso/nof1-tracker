import { CommandOptions } from '../types/command';
import { ConfigManager } from '../services/config-manager';
import { MessageFormatService } from '../utils/message-format';
import { SlackService } from '../services/slack-service';

export async function handleSlackCommand(options: CommandOptions): Promise<void> {
  console.log('🚀 Attempting to send a test Slack message...');

  const configManager = new ConfigManager();
  configManager.loadFromEnvironment();

  const slackConfig = configManager.getConfig().slack;
  if (!slackConfig.enabled) {
    console.log('❌ Slack notifications are not enabled in your configuration. Set SLACK_ENABLED=true in your .env file.');
    return;
  }

  if (!slackConfig.token) {
    console.log('❌ Slack API Token is not set. Please set SLACK_OAUTH_TOKEN in your .env file.');
    return;
  }

  if (!slackConfig.channel) {
    console.log('❌ Slack Channel is not set. Please set SLACK_CHANNEL_NAME in your .env file.');
    return;
  }

  try {
    const messageFormatService = new MessageFormatService();
    const slackService = new SlackService(slackConfig.token);
    const testMessage = messageFormatService.formatTradeMessage({
      symbol: 'TEST',
      side: 'BUY',
      quantity: '0.1',
      price: '45,000.00',
      orderId: 'TEST123456789',
      status: 'FILLED',
      leverage: 10,
      marginType: 'ISOLATED'
    }); 
    await slackService.sendMessage(slackConfig.channel, testMessage);
    console.log('✅ Test Slack message sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send test Slack message:', error instanceof Error ? error.message : error);
  }
}
