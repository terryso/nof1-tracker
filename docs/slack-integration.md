# Slack Integration Guide

This guide explains how to set up Slack notifications for the Nof1 Tracker bot, including getting OAuth tokens, finding channel names, and adding the bot to channels.

## Table of Contents

1. [Creating a Slack App](#creating-a-slack-app)
2. [Setting Up OAuth Token](#setting-up-oauth-token)
3. [Getting Channel Name](#getting-channel-name)
4. [Adding Bot to Channel](#adding-bot-to-channel)
5. [Configuring Environment Variables](#configuring-environment-variables)
6. [Testing the Integration](#testing-the-integration)
7. [Troubleshooting](#troubleshooting)

---

## Creating a Slack App

### Step 1: Create a New App

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Select **"From scratch"**
4. Enter app details:
   - **App Name**: `Nof1 Tracker` (or any name you prefer)
   - **Pick a workspace**: Select your Slack workspace
5. Click **"Create App"**

### Step 2: Add Bot User

1. In your app settings, go to **"OAuth & Permissions"** in the sidebar
2. Scroll down to **"Bot Token Scopes"**
3. Click **"Add an OAuth Scope"**
4. Add the following scopes (permissions):
   - `chat:write` - Send messages to channels
   - `chat:write.public` - Send messages to public channels without joining
   - `channels:read` - View basic information about public channels
   - `groups:read` - View basic information about private channels (if needed)

### Step 3: Enable Socket Mode (Optional but Recommended)

For production use, you might want to use Socket Mode for real-time events:

1. Go to **"Socket Mode"** in the sidebar
2. Toggle it **ON**
3. Follow the prompts to create and store your app-level token

---

## Setting Up OAuth Token

### Step 1: Install App to Workspace

1. Go to **"OAuth & Permissions"** in the sidebar
2. Scroll to **"Install App to Workspace"** at the top
3. Click the button
4. Review the requested permissions
5. Click **"Allow"** to authorize the app

### Step 2: Copy Bot Token

1. After installation, you'll see your **Bot User OAuth Token**
2. It looks like: `xoxb-xxxx`
3. Copy this token - **you'll need it for your `.env` file**
4. Keep this token secure and never share it publicly

### Step 3: Secure Your Token

```bash
# Add the token to your .env file
echo "SLACK_OAUTH_TOKEN=xoxb-your-token-here" >> .env
```

---

## Getting Channel Name

### For Public Channels

1. Open the Slack channel in your workspace
2. Click on the channel name at the top (e.g., `#general`)
3. Look at the URL - it will show something like:
   ```
   https://yourworkspace.slack.com/archives/C0123456789
   ```
4. Or look at the "Details" tab in the channel info
5. The channel name is the part without the `#` (e.g., `general`, `new-channel`)

### For Private Channels

1. Go to the channel details (click channel name)
2. Look at the channel name in the details tab
3. Private channel names don't use `#` in the API

### Finding Channel ID (Alternative)

1. Right-click on the channel in the sidebar
2. Select **"View channel details"**
3. Scroll down to find the **Channel ID** (starts with `C0...`)
4. You can use either the channel name or ID

**Note**: Channel names should be written WITHOUT the `#` symbol in your configuration.

---

## Adding Bot to Channel

### Method 1: Invite via Message

1. Open the Slack channel where you want the bot to send messages
2. Type in the message box:
   ```
   /invite @Nof1 Tracker
   ```
   (Replace "Nof1 Tracker" with your actual bot's name)
3. Press Enter

### Method 2: Invite via Channel Details

1. Click on the channel name at the top
2. Go to the **"Integrations"** tab
3. Click **"Add apps"** or **"Browse all apps"**
4. Search for your app name ("Nof1 Tracker")
5. Click **"Add"** or **"Add to Channel"**

### Method 3: Direct Channel Settings (for Public Channels)

1. Click on channel name → **"Settings"** tab
2. Go to **"Integrations"** section
3. Click **"Add apps"**
4. Select your bot and add it

### Verification

To verify the bot is in the channel:
1. Look at the "People" tab in channel details
2. You should see your bot listed there
3. Or use `/kick @botname` and then re-invite if there are issues

---

## Configuring Environment Variables

Add the following variables to your `.env` file:

```bash
# Slack Configuration
SLACK_ENABLED=true
SLACK_OAUTH_TOKEN=xoxb-your-bot-token-here
SLACK_CHANNEL_NAME=new-channel

# Example with actual values:
# SLACK_ENABLED=true
# SLACK_OAUTH_TOKEN=xoxb-xxx
# SLACK_CHANNEL_NAME=new-channel
```

### Important Notes

- `SLACK_ENABLED=true` - Must be exactly `true` (string, not boolean)
- `SLACK_OAUTH_TOKEN` - The Bot User OAuth Token from step 2
- `SLACK_CHANNEL_NAME` - Channel name WITHOUT `#` symbol (e.g., `new-channel` not `#new-channel`)

---

## Testing the Integration

### Step 1: Build the Project

```bash
npm run build
```

### Step 2: Test Slack Command

```bash
npm start -- slack-test
```

### Expected Output

If successful, you should see:
```
🚀 Attempting to send a test Slack message...
✅ Test Slack message sent successfully!
```

### Common Errors

#### Error: `not_in_channel`

**Problem**: Bot is not in the channel

**Solution**:
1. Invite the bot to the channel: `/invite @YourBotName`
2. Or add via channel settings → Integrations → Add apps

#### Error: `invalid_auth`

**Problem**: Token is incorrect or expired

**Solution**:
1. Go to Slack App settings → OAuth & Permissions
2. Regenerate the token
3. Update `.env` file with new token
4. Rebuild: `npm run build`

#### Error: `channel_not_found`

**Problem**: Incorrect channel name

**Solution**:
1. Verify channel name (without `#`)
2. Check if channel exists in workspace
3. For private channels, ensure bot has access

---

## Troubleshooting

### Bot Not Receiving Messages

**Issue**: Bot is in channel but not responding

**Solution**:
1. Check OAuth scopes include `chat:write`
2. Verify bot is still installed in workspace
3. Check channel permissions (public vs private)

### Permission Denied

**Issue**: Bot can't send messages

**Solution**:
1. Ensure `chat:write` scope is added
2. For public channels, add `chat:write.public` scope
3. Reinstall the app: OAuth & Permissions → Install to Workspace

### Token Expired

**Issue**: Token no longer works

**Solution**:
1. Go to app settings
2. Click "Reinstall to Workspace"
3. Copy new token
4. Update `.env` file
5. Rebuild project

### Channel Not Found

**Issue**: Cannot find channel

**Solution**:
1. Use channel name, NOT channel ID
2. Remove `#` from channel name
3. Example: Use `general` not `#general`
4. For private channels, use proper name format

---

## Security Best Practices

### 1. Protect Your Token

- Never commit `.env` file to version control
- Add `.env` to `.gitignore`
- Don't share token publicly
- Regenerate token if exposed

### 2. Restrict Permissions

- Only add scopes you need
- Use `chat:write.public` instead of `chat:write` if possible
- Don't grant unnecessary workspace permissions

### 3. Monitor Usage

- Regularly check app activity in Slack workspace
- Review sent messages
- Monitor for unauthorized access

---

## Advanced Configuration

### Custom Message Formatting

You can customize message formatting in `src/services/slack-service.ts`:

```typescript
await this.webClient.chat.postMessage({
    channel: channelName,
    text: message, // Fallback text
    blocks: [
        {
            type: 'header',
            text: {
                type: 'plain_text',
                text: 'Trade Executed',
                emoji: true
            }
        },
        // ... more blocks
    ]
});
```

### Using Webhooks (Alternative)

For simpler integration without OAuth:

1. Incoming Webhooks don't require bot user
2. Easier to set up
3. Less permissions needed
4. Limited functionality compared to Web API

---

## Support

### Getting Help

- **Documentation**: Check this guide first
- **Slack API Docs**: [https://api.slack.com/docs](https://api.slack.com/docs)
- **Issues**: Report problems via GitHub Issues

### Useful Links

- Slack App Directory: [https://api.slack.com/apps](https://api.slack.com/apps)
- Web API Guide: [https://api.slack.com/web](https://api.slack.com/web)
- Block Kit Builder: [https://app.slack.com/block-kit-builder](https://app.slack.com/block-kit-builder)

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0  
**Compatible with**: Nof1 Tracker v2.0.0+

