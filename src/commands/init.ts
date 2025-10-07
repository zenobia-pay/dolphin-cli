import { Command } from 'commander';
import prompts from 'prompts';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { execa } from 'execa';

export const initCommand = new Command('init')
  .description('Initialize a new project from the master-maker-template')
  .argument('[name]', 'Project name (defaults to current directory)')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(async (projectName, options) => {
    const targetDir = projectName ? path.resolve(projectName) : process.cwd();
    const dirName = path.basename(targetDir);
    
    console.log(chalk.blue.bold(`\n🚀 Initializing project: ${dirName}\n`));

    // Check if directory exists and is not empty
    if (await fs.pathExists(targetDir)) {
      const files = await fs.readdir(targetDir);
      // Allow .git directory to exist
      const nonGitFiles = files.filter(f => f !== '.git');
      if (nonGitFiles.length > 0) {
        if (!options.yes) {
          const response = await prompts({
            type: 'confirm',
            name: 'value',
            message: `Directory "${dirName}" is not empty. Continue anyway?`,
            initial: false
          });

          if (!response.value) {
            console.log(chalk.yellow('Initialization cancelled'));
            return;
          }
        }
      }
    }

    const spinner = ora();

    try {
      // Clone the template repository
      spinner.start('Cloning master-maker-template...');
      
      if (projectName) {
        // Clone to new directory
        await execa('git', ['clone', 'https://github.com/zenobia-pay/master-maker-template', targetDir]);
        spinner.succeed('Cloned template repository');
        
        // Change to target directory
        process.chdir(targetDir);
        
        // Remove template's git history
        spinner.start('Cleaning up template...');
        await fs.remove('.git');
        spinner.succeed('Cleaned up template');
      } else {
        // Clone to current directory
        const tempDir = path.join(process.cwd(), '.dolphin-temp');
        
        // Clone to temp directory first
        await execa('git', ['clone', 'https://github.com/zenobia-pay/master-maker-template', tempDir]);
        spinner.succeed('Cloned template repository');
        
        spinner.start('Moving files to current directory...');
        
        // Move all files from temp to current directory
        const files = await fs.readdir(tempDir);
        for (const file of files) {
          if (file === '.git') continue; // Skip .git directory
          const srcPath = path.join(tempDir, file);
          const destPath = path.join(process.cwd(), file);
          await fs.move(srcPath, destPath, { overwrite: true });
        }
        
        // Clean up temp directory
        await fs.remove(tempDir);
        spinner.succeed('Moved template files');
      }

      // Update package.json with the project name
      spinner.start('Updating project configuration...');
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        packageJson.name = dirName.toLowerCase().replace(/\s+/g, '-');
        await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      }
      spinner.succeed('Updated project configuration');

      // Initialize new git repository
      spinner.start('Initializing git repository...');
      await execa('git', ['init']);
      await execa('git', ['add', '.']);
      await execa('git', ['commit', '-m', 'Initial commit from dolphinmade-cli']);
      spinner.succeed('Initialized git repository');

      // Install dependencies
      spinner.start('Installing dependencies...');
      await execa('pnpm', ['install']);
      spinner.succeed('Installed dependencies');

      console.log(chalk.green.bold(`\n✅ Project "${dirName}" initialized successfully!\n`));
      console.log(chalk.cyan('Next steps:'));
      if (projectName) {
        console.log(chalk.gray(`1. cd ${projectName}`));
        console.log(chalk.gray('2. Copy .env.example to .env and configure'));
      } else {
        console.log(chalk.gray('1. Copy .env.example to .env and configure'));
      }
      console.log(chalk.gray('2. Run database setup: npm run db:generate && npm run db:migrate'));
      console.log(chalk.gray('3. Start development: npm run dev'));
      console.log(chalk.gray('\nOptional:'));
      console.log(chalk.gray('- Configure OAuth providers in .env'));
      console.log(chalk.gray('- Deploy to Cloudflare: npm run deploy'));
      console.log(chalk.gray('\nUseful commands:'));
      console.log(chalk.gray('- dolphinmade create-page <name> - Create a new page'));
      console.log(chalk.gray('- dolphinmade add-pricing - Add pricing components'));
      console.log(chalk.gray('- dolphinmade add-ai-chat - Add AI chat assistant'));

    } catch (error: any) {
      spinner.fail('Project initialization failed');
      
      // Check for common errors
      if (error.message?.includes('git')) {
        console.error(chalk.red('\nError: Git is not installed or not in PATH'));
        console.error(chalk.yellow('Please install git and try again: https://git-scm.com/downloads'));
      } else if (error.message?.includes('npm')) {
        console.error(chalk.red('\nError: npm is not installed or not in PATH'));
        console.error(chalk.yellow('Please install Node.js and npm: https://nodejs.org/'));
      } else if (error.message?.includes('Could not resolve host')) {
        console.error(chalk.red('\nError: Unable to connect to GitHub'));
        console.error(chalk.yellow('Please check your internet connection and try again'));
      } else {
        console.error(chalk.red('Error:'), error.message || error);
      }
      
      // Clean up on failure
      if (projectName && await fs.pathExists(targetDir)) {
        const files = await fs.readdir(targetDir);
        if (files.length === 0 || (files.length === 1 && files[0] === '.git')) {
          await fs.remove(targetDir);
        }
      }
      
      process.exit(1);
    }
  });