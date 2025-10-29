
import TelegramBot from 'node-telegram-bot-api';

export class TelegramService {
  private bot: TelegramBot;

  constructor(token: string) {
    this.bot = new TelegramBot(token, { polling: false });
  }

  async sendMessage(chatId: string, message: string): Promise<void> {
    try {
      console.log('Sending message to Telegram...');
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Error sending message to Telegram:', error);
      throw error;
    }
  }


}
