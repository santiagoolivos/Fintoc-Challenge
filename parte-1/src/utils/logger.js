import chalk from 'chalk';

export const logger = {
  info: (message) => {
    console.log(chalk.blue('ℹ'), message);
  },

  success: (message) => {
    console.log(chalk.green('✓'), message);
  },

  warning: (message) => {
    console.log(chalk.yellow('⚠'), message);
  },

  error: (message) => {
    console.log(chalk.red('✗'), message);
  },

  progress: (current, total, message) => {
    const percentage = Math.round((current / total) * 100);
    const bar = '█'.repeat(Math.floor(percentage / 5)) + '░'.repeat(20 - Math.floor(percentage / 5));
    console.log(chalk.cyan(`[${bar}] ${percentage}%`), message);
  },

  table: (data) => {
    console.table(data);
  },

  divider: () => {
    console.log(chalk.gray('─'.repeat(60)));
  },

  header: (title) => {
    console.log();
    console.log(chalk.bold.white(title));
    console.log(chalk.gray('─'.repeat(60)));
  }
};
