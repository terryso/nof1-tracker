import { WebClient } from "@slack/web-api";

export class SlackService {
    private webClient: WebClient;

    constructor(token: string) {
        this.webClient = new WebClient(token);
    }

    async sendMessage(channel: string, message: string): Promise<void> {
        try {
            await this.webClient.chat.postMessage({
                channel: channel,
                text: message, // Fallback for notifications
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: message
                        }
                    }
                ]
            });
            console.log('Message sent to Slack successfully');
        } catch (error) {
            console.error('Error sending message to Slack:', error);
            throw error;
        }
    }

}