import 'dotenv/config';
import { Command } from 'commander';
import { createInterface } from 'readline';
import { FintocClient } from './fintoc-client.js';
import { TransferService } from './transfer-service.js';
import { ReportGenerator } from './report-generator.js';
import { logger } from './utils/logger.js';

// Helper function to prompt user for input
function askQuestion(question) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

const program = new Command();

program
  .name('fintoc-transfers')
  .description('Execute high-value transfers via Fintoc API by splitting into smaller chunks')
  .version('1.0.0')
  .requiredOption('--amount <number>', 'Total amount to transfer in CLP')
  .requiredOption('--rut <string>', 'Recipient RUT (e.g., 12345678-9)')
  .requiredOption('--name <string>', 'Recipient full name')
  .requiredOption('--account <string>', 'Recipient account number')
  .requiredOption('--bank <string>', 'Bank institution ID (e.g., cl_banco_santander)')
  .requiredOption('--type <string>', 'Account type: checking_account or sight_account')
  .option('--comment <string>', 'Base comment for transfers', 'Pago')
  .option('--reference-id <string>', 'Reference ID for transfers (max 7 digits, Mexico only)')
  .option('--skip-polling', 'Skip polling for final transfer statuses', false)
  .parse(process.argv);

const options = program.opts();

async function validateConfig() {
  const required = [
    { key: 'FINTOC_API_KEY', value: process.env.FINTOC_API_KEY },
    { key: 'FINTOC_JWS_PRIVATE_KEY_PATH', value: process.env.FINTOC_JWS_PRIVATE_KEY_PATH },
    { key: 'FINTOC_ACCOUNT_ID', value: process.env.FINTOC_ACCOUNT_ID }
  ];

  const missing = required.filter(r => !r.value);
  if (missing.length > 0) {
    logger.error('Missing required environment variables:');
    missing.forEach(m => logger.error(`  - ${m.key}`));
    logger.info('Please check your .env file. See .env.example for reference.');
    process.exit(1);
  }

  return {
    apiKey: process.env.FINTOC_API_KEY,
    jwsPrivateKeyPath: process.env.FINTOC_JWS_PRIVATE_KEY_PATH,
    accountId: process.env.FINTOC_ACCOUNT_ID
  };
}

function validateInputs() {
  const amount = parseInt(options.amount, 10);
  if (isNaN(amount) || amount <= 0) {
    logger.error('Invalid amount. Must be a positive integer.');
    process.exit(1);
  }

  const validAccountTypes = ['checking_account', 'sight_account'];
  if (!validAccountTypes.includes(options.type)) {
    logger.error(`Invalid account type. Must be one of: ${validAccountTypes.join(', ')}`);
    process.exit(1);
  }

  // Validate RUT format (basic check)
  const rutPattern = /^\d{7,8}-[\dkK]$/;
  if (!rutPattern.test(options.rut)) {
    logger.warning('RUT format may be invalid. Expected format: 12345678-9');
  }

  return {
    amount,
    counterparty: {
      holderId: options.rut,
      holderName: options.name,
      accountNumber: options.account,
      accountType: options.type,
      institutionId: options.bank
    },
    comment: options.comment,
    referenceId: options.referenceId || null,
    skipPolling: options.skipPolling
  };
}

async function main() {
  logger.header('Fintoc High-Value Transfer Script');
  logger.info('Starting transfer process...');
  logger.divider();

  // Validate configuration
  const config = await validateConfig();
  logger.success('Environment configuration validated');

  // Validate inputs
  const inputs = validateInputs();
  logger.success('Input parameters validated');

  // Display transfer plan
  logger.header('Transfer Details');
  logger.info(`Amount: $${inputs.amount.toLocaleString('es-CL')} CLP`);
  logger.info(`Recipient: ${inputs.counterparty.holderName}`);
  logger.info(`RUT: ${inputs.counterparty.holderId}`);
  logger.info(`Account: ${inputs.counterparty.accountNumber}`);
  logger.info(`Bank: ${inputs.counterparty.institutionId}`);
  logger.info(`Account Type: ${inputs.counterparty.accountType}`);
  logger.divider();

  // Initialize Fintoc client
  const fintocClient = new FintocClient(config);
  await fintocClient.initialize();

  // Check if we're in test mode
  const isTestMode = fintocClient.isTestMode();
  if (isTestMode) {
    logger.info('Running in TEST MODE');
  }

  // Create transfer service and report generator
  const transferService = new TransferService(fintocClient);
  const reportGenerator = new ReportGenerator();

  const metadata = {
    totalAmount: inputs.amount,
    currency: 'CLP',
    recipient: {
      holder_id: inputs.counterparty.holderId,
      holder_name: inputs.counterparty.holderName,
      account_number: inputs.counterparty.accountNumber,
      account_type: inputs.counterparty.accountType,
      institution_id: inputs.counterparty.institutionId
    },
    mode: isTestMode ? 'test' : 'live'
  };

  // Step 1: Check balance before proceeding
  logger.header('Balance Verification');
  const balanceInfo = await fintocClient.getAccountBalance();

  if (!balanceInfo.success) {
    logger.error(`Failed to check balance: ${balanceInfo.error}`);
    process.exit(1);
  }

  const availableBalance = balanceInfo.balance.available;
  logger.info(`Account: ${balanceInfo.name}`);
  logger.info(`Available Balance: $${availableBalance.toLocaleString('es-CL')} CLP`);
  logger.info(`Amount to Transfer: $${inputs.amount.toLocaleString('es-CL')} CLP`);

  // Step 2: If insufficient balance, offer to simulate deposit (only in test mode)
  if (availableBalance < inputs.amount) {
    const deficit = inputs.amount - availableBalance;
    logger.warning(`Insufficient balance! Deficit: $${deficit.toLocaleString('es-CL')} CLP`);

    if (isTestMode) {
      logger.divider();
      logger.info('You are in TEST MODE. You can simulate a deposit to add funds.');

      const answer = await askQuestion(
        `\n¿Do you want to simulate a deposit of $${deficit.toLocaleString('es-CL')} CLP (deficit only)? (yes/no): `
      );

      if (answer === 'yes' || answer === 'y' || answer === 'si' || answer === 's') {
        logger.divider();
        logger.header('Simulating Deposit');

        const depositResult = await fintocClient.simulateDeposit(deficit);

        if (depositResult.success) {
          logger.success('Deposit simulated successfully!');
          logger.divider();
          logger.info(`Status: ${depositResult.status}`);
          logger.info(`Amount Deposited: $${depositResult.amountDeposited.toLocaleString('es-CL')} CLP`);

          if (depositResult.newBalance) {
            logger.info(`New Available Balance: $${depositResult.newBalance.available.toLocaleString('es-CL')} CLP`);
            logger.info(`New Current Balance: $${depositResult.newBalance.current.toLocaleString('es-CL')} CLP`);
          }
          logger.divider();
        } else {
          logger.error(`Failed to simulate deposit: ${depositResult.error}`);

          // Generate error report
          const errorData = {
            aborted: true,
            error: depositResult.error,
            errorType: 'deposit_simulation_failed',
            results: []
          };
          const { jsonPath, textPath } = reportGenerator.generateErrorReport(errorData, metadata);

          logger.info('Error reports saved to:');
          logger.info(`  JSON: ${jsonPath}`);
          logger.info(`  Text: ${textPath}`);
          process.exit(1);
        }
      } else {
        logger.info('Deposit simulation cancelled by user.');

        // Generate error report for insufficient balance
        const errorData = {
          aborted: true,
          error: `Insufficient balance. Available: $${availableBalance.toLocaleString('es-CL')} CLP, Required: $${inputs.amount.toLocaleString('es-CL')} CLP`,
          errorType: 'insufficient_balance',
          details: {
            available: availableBalance,
            required: inputs.amount,
            deficit: deficit
          },
          results: []
        };
        const { jsonPath, textPath } = reportGenerator.generateErrorReport(errorData, metadata);

        logger.info('Error reports saved to:');
        logger.info(`  JSON: ${jsonPath}`);
        logger.info(`  Text: ${textPath}`);
        process.exit(1);
      }
    } else {
      // Live mode - cannot simulate, just fail
      logger.error('Cannot proceed without sufficient funds in LIVE mode.');

      const errorData = {
        aborted: true,
        error: `Insufficient balance. Available: $${availableBalance.toLocaleString('es-CL')} CLP, Required: $${inputs.amount.toLocaleString('es-CL')} CLP`,
        errorType: 'insufficient_balance',
        details: {
          available: availableBalance,
          required: inputs.amount,
          deficit: deficit
        },
        results: []
      };
      const { jsonPath, textPath } = reportGenerator.generateErrorReport(errorData, metadata);

      logger.info('Error reports saved to:');
      logger.info(`  JSON: ${jsonPath}`);
      logger.info(`  Text: ${textPath}`);
      process.exit(1);
    }
  } else {
    logger.success('Sufficient balance available.');
  }

  logger.divider();

  // Execute transfers (skip balance check since we already verified)
  const executionResult = await transferService.executeTransfers(
    inputs.amount,
    inputs.counterparty,
    inputs.comment,
    inputs.referenceId,
    true // skipBalanceCheck = true
  );

  // Check if execution was aborted due to error
  if (executionResult.aborted || !executionResult.success) {
    logger.header('Transfer Process Failed');
    logger.error(`Error: ${executionResult.error || executionResult.abortReason}`);
    logger.divider();

    // Generate error report
    const { jsonPath, textPath } = reportGenerator.generateErrorReport(executionResult, metadata);

    logger.header('Process Aborted');
    logger.error('Transfers were NOT completed due to the error above.');
    logger.info('Error reports saved to:');
    logger.info(`  JSON: ${jsonPath}`);
    logger.info(`  Text: ${textPath}`);

    process.exit(1);
  }

  // Poll for final statuses (unless skipped)
  let finalResults = executionResult.results;
  if (!inputs.skipPolling && finalResults.length > 0) {
    finalResults = await transferService.pollTransferStatuses(finalResults);
  }

  // Generate summary
  const summary = transferService.summarizeResults(finalResults);

  // Generate success report
  const { jsonPath } = reportGenerator.generateReport(finalResults, summary, metadata);

  // Final output
  logger.header('Process Complete');
  logger.success(`Report saved to:`);
  logger.info(`  JSON: ${jsonPath}`);
}

main().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
