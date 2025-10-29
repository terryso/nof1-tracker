
export interface TradeNotificationData {
    symbol: string;
    side: 'BUY' | 'SELL';
    quantity: string;
    price: string;
    orderId: string;
    status: string;
    leverage?: number;
    marginType?: string;
}

export class MessageFormatService {
    formatTradeMessage(data: TradeNotificationData): string {
        const { symbol, side, quantity, price, orderId, status, leverage, marginType } = data;
        
        // Determine emoji based on side
        const sideEmoji = side === 'BUY' ? '📈' : '📉';
        const sideText = side === 'BUY' ? 'LONG' : 'SHORT';
        
        // Build message with Markdown formatting (works for both Telegram and Slack)
        let message = `✅ *Trade Executed*\n\n`;
        message += `${sideEmoji} *${sideText}* ${symbol}\n`;
        message += `💰 *Quantity:* ${quantity}\n`;
        message += `💵 *Price:* ${price}\n`;
        message += `🆔 *Order ID:* ${orderId}\n`;
        message += `📊 *Status:* ${status}\n`;
        
        if (leverage) {
          message += `⚡ *Leverage:* ${leverage}x\n`;
        }
        
        if (marginType) {
          const marginTypeText = marginType === 'ISOLATED' ? '🔒 Isolated' : '🔄 Cross';
          message += `${marginTypeText}\n`;
        }
        
        return message;
      }

      formatStopOrderMessage(type: 'take_profit' | 'stop_loss', symbol: string, price: string, orderId: string): string {
        const emoji = type === 'take_profit' ? '🎯' : '🛡️';
        const label = type === 'take_profit' ? 'Take Profit' : 'Stop Loss';
        
        let message = `${emoji} *${label} Order Set*\n\n`;
        message += `📊 *Symbol:* ${symbol}\n`;
        message += `💵 *Price:* ${price}\n`;
        message += `🆔 *Order ID:* ${orderId}\n`;
        
        return message;
      }
}