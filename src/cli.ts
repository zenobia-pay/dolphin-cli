#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { pricingCommand } from './commands/pricing.js';
import { aiAssistantCommand } from './commands/ai-assistant.js';
import { createPageCommand } from './commands/create-page.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('dolphin-maker')
  .description(chalk.blue('CLI for composable codebase edits'))
  .version(packageJson.version)
  .showHelpAfterError('(add --help for additional information)');

// Add commands
program.addCommand(pricingCommand);
program.addCommand(aiAssistantCommand);
program.addCommand(createPageCommand);

// Parse command line arguments
program.parse(process.argv);

// Show help if no command is provided
if (!process.argv.slice(2).length) {
  console.log(chalk.blue(`
   🐬 ${chalk.bold('Dolphin Maker')} - Composable Codebase Tools
  `));
  program.outputHelp();
}