import { NotificationManager, TelegramNotificationProvider, SlackNotificationProvider, TradeNotificationData, StopOrderData } from 'tracker-notification';
require('dotenv').config();

export default async function SendNotification(type: 'trade' | 'stop_order', tradeData: TradeNotificationData | StopOrderData) {
  try {
    // 1. Create notification manager
    const notifications = new NotificationManager();

    if (process.env.NOTIFICATION_TELEGRAM_ENABLED === 'true') {
      // 2. Add telegram provider directly
      const telegramProvider = new TelegramNotificationProvider({
        botToken: process.env.TELEGRAM_BOT_TOKEN || '123456:ABC-DEF',
        chatId: process.env.TELEGRAM_CHAT_ID || '123456789',
        parseMode: 'Markdown'
      });
      notifications.addProvider(telegramProvider);
    }

    if (process.env.NOTIFICATION_SLACK_ENABLED === 'true') {
      const slackProvider = new SlackNotificationProvider({
        botToken: process.env.SLACK_BOT_TOKEN || 'xoxb-test-token',
        channelId: process.env.SLACK_CHANNEL_ID || 'C123456789',
        username: 'Trading Bot'
      });
      notifications.addProvider(slackProvider);
    }

    if (type === 'trade') {
      await notifications.notifyTrade(tradeData as TradeNotificationData);
      console.log('\n🎉 Trade notification sent successfully!');
    } else if (type === 'stop_order') {
      await notifications.notifyStopOrder(tradeData as StopOrderData);
      console.log('\n🎉 Stop order notification sent successfully!');
    }


  } catch (error) {
    console.error('❌ Notification service failed:', error);
  }
}

