#!/usr/bin/env node

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import {
  handleAgentsCommand,
  handleFollowCommand,
  handleStatusCommand,
  handleProfitCommand,
  ProfitCommandOptions,
  handleTelegramCommand,
  handleSlackCommand
} from './commands';
import { handleError, getVersion } from './utils/command-helpers';

// Load environment variables
dotenv.config();

// ============================================================================
// CLI Program Setup
// ============================================================================

const program = new Command();

program
  .name('nof1-trade')
  .description('CLI tool for automated contract trading based on nof1 AI agents')
  .version(getVersion());

// ============================================================================
// Command Registration
// ============================================================================

// List agents command
program
  .command('agents')
  .description('List all available AI agents')
  .action(async () => {
    try {
      await handleAgentsCommand();
    } catch (error) {
      handleError(error, 'Failed to fetch agents');
    }
  });

// Follow agent command
program
  .command('follow <agent-name>')
  .description('Follow a specific AI agent and copy their trades')
  .option('-r, --risk-only', 'only perform risk assessment without executing trades')
  .option('-i, --interval <seconds>', 'polling interval in seconds for continuous monitoring', '30')
  .option('-t, --price-tolerance <percentage>', 'set price tolerance threshold (default: 1%)', parseFloat)
  .option('-m, --total-margin <amount>', 'set total margin for futures trading (default: 10 USDT)', parseFloat)
  .option('--profit <percentage>', 'auto exit when profit reaches specified percentage (e.g., 30 for 30%)', parseFloat)
  .option('--auto-refollow', 'automatically refollow after profit target exit (default: false)')
  .option('--margin-type <type>', 'margin mode: ISOLATED (isolated) or CROSSED (cross, default)', 'CROSSED')
  .action(async (agentName, options) => {
    try {
      await handleFollowCommand(agentName, options);
    } catch (error) {
      handleError(error, 'Follow agent failed');
    }
  });

program
  .command('telegram-test')
  .description('Send a test Telegram message')
  .action(async (options) => {
    try {
      await handleTelegramCommand(options);
    } catch (error) {
      handleError(error, 'Failed to send test Telegram message');
    }
  });

program
  .command('slack-test')
  .description('Send a test Slack message')
  .action(async (options) => {
    try {
      await handleSlackCommand(options);
    } catch (error) {
      handleError(error, 'Failed to send test Slack message');
    }
  });
  
// Status command
program
  .command('status')
  .description('Check system status and configuration')
  .action(() => {
    handleStatusCommand();
  });

// Profit command
program
  .command('profit')
  .description('Analyze profit/loss statistics for futures trades')
  .option('-s, --since <time>', 'time filter: "7d" (last 7 days), "2024-01-01" (since date), or timestamp. If not specified, uses order history start time')
  .option('-p, --pair <symbol>', 'specific trading pair (e.g., BTCUSDT)')
  .option('--group-by <type>', 'group results by symbol or all', 'all')
  .option('--format <type>', 'output format: table or json', 'table')
  .option('--refresh', 'force refresh cache and fetch fresh data')
  .option('--exclude-unrealized', 'exclude current positions unrealized P&L from analysis')
  .option('--unrealized-only', 'show only current positions unrealized P&L')
  .action(async (options: ProfitCommandOptions) => {
    try {
      await handleProfitCommand(options);
    } catch (error) {
      handleError(error, 'Profit analysis failed');
    }
  });

// ============================================================================
// Parse CLI Arguments
// ============================================================================

program.parse();
