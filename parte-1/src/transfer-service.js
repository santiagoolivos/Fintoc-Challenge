import { randomUUID } from 'crypto';
import { logger } from './utils/logger.js';

const MAX_TRANSFER_AMOUNT = 7000000; // 7 million CLP max per transfer
const POLL_INTERVAL_MS = 2000; // 2 seconds between status checks
const MAX_POLL_ATTEMPTS = 30; // Max 1 minute of polling per transfer

// Critical errors that should stop all transfers immediately
const CRITICAL_ERRORS = [
  'insufficient_balance',
  'invalid_holder_id',
  'invalid_account',
  'account_not_found',
  'unauthorized',
  'forbidden',
  'invalid_comment_size'
];

const MAX_COMMENT_LENGTH = 40;

export class TransferService {
  constructor(fintocClient) {
    this.client = fintocClient;
  }

  calculateTransferChunks(totalAmount) {
    const chunks = [];
    let remaining = totalAmount;
    let index = 1;

    while (remaining > 0) {
      const chunkAmount = Math.min(remaining, MAX_TRANSFER_AMOUNT);
      chunks.push({
        index,
        amount: chunkAmount
      });
      remaining -= chunkAmount;
      index++;
    }

    return chunks;
  }

  async verifyBalance(totalAmount) {
    logger.info('Verifying account balance before transfers...');

    const balanceInfo = await this.client.getAccountBalance();

    if (!balanceInfo.success) {
      return {
        success: false,
        error: `Failed to get account balance: ${balanceInfo.error}`,
        errorType: 'balance_check_failed'
      };
    }

    const availableBalance = balanceInfo.balance.available;

    logger.info(`Account: ${balanceInfo.name}`);
    logger.info(`Available balance: $${availableBalance.toLocaleString('es-CL')} CLP`);
    logger.info(`Amount to transfer: $${totalAmount.toLocaleString('es-CL')} CLP`);

    if (availableBalance < totalAmount) {
      const deficit = totalAmount - availableBalance;
      return {
        success: false,
        error: `Insufficient balance. Available: $${availableBalance.toLocaleString('es-CL')} CLP, Required: $${totalAmount.toLocaleString('es-CL')} CLP, Deficit: $${deficit.toLocaleString('es-CL')} CLP`,
        errorType: 'insufficient_balance',
        details: {
          available: availableBalance,
          required: totalAmount,
          deficit: deficit
        }
      };
    }

    logger.success(`Balance verified. Sufficient funds available.`);
    return {
      success: true,
      balance: balanceInfo.balance
    };
  }

  isCriticalError(errorMessage) {
    if (!errorMessage) return false;
    const lowerError = errorMessage.toLowerCase();
    return CRITICAL_ERRORS.some(criticalError => lowerError.includes(criticalError));
  }

  generateUniqueComment(baseComment, index, total) {
    const uniqueId = randomUUID().substring(0, 4);
    const suffix = ` ${index}/${total} #${uniqueId}`;
    const maxBaseLength = MAX_COMMENT_LENGTH - suffix.length;

    // Truncate base comment if needed to fit within 40 chars
    const truncatedBase = baseComment.length > maxBaseLength
      ? baseComment.substring(0, maxBaseLength - 2) + '..'
      : baseComment;

    return `${truncatedBase}${suffix}`;
  }

  validateComment(baseComment, totalTransfers) {
    // Calculate the suffix length for the worst case (max index)
    const maxSuffix = ` ${totalTransfers}/${totalTransfers} #xxxx`;
    const maxBaseLength = MAX_COMMENT_LENGTH - maxSuffix.length;

    if (baseComment.length > maxBaseLength) {
      logger.warning(`Comment will be truncated (max ${maxBaseLength} chars for ${totalTransfers} transfers)`);
    }

    return true;
  }

  async executeTransfers(totalAmount, counterparty, baseComment = 'Pago', referenceId = null, skipBalanceCheck = false) {
    // Step 1: Verify balance before starting (unless skipped)
    if (!skipBalanceCheck) {
      const balanceCheck = await this.verifyBalance(totalAmount);
      if (!balanceCheck.success) {
        return {
          success: false,
          aborted: true,
          error: balanceCheck.error,
          errorType: balanceCheck.errorType,
          details: balanceCheck.details,
          results: []
        };
      }
    }

    const chunks = this.calculateTransferChunks(totalAmount);
    const results = [];
    let aborted = false;
    let abortReason = null;

    // Validate comment length
    this.validateComment(baseComment, chunks.length);

    logger.header('Transfer Execution Plan');
    logger.info(`Total amount: $${totalAmount.toLocaleString('es-CL')} CLP`);
    logger.info(`Number of transfers: ${chunks.length}`);
    logger.info(`Max per transfer: $${MAX_TRANSFER_AMOUNT.toLocaleString('es-CL')} CLP`);
    logger.divider();

    for (const chunk of chunks) {
      const comment = this.generateUniqueComment(baseComment, chunk.index, chunks.length);
      const idempotencyKey = randomUUID();

      logger.progress(chunk.index, chunks.length, `Executing transfer ${chunk.index}/${chunks.length} - $${chunk.amount.toLocaleString('es-CL')} CLP`);

      const result = await this.client.createTransfer({
        amount: chunk.amount,
        counterparty,
        comment,
        referenceId,
        idempotencyKey
      });

      results.push({
        index: chunk.index,
        amount: chunk.amount,
        baseComment,
        comment,
        referenceId,
        ...result
      });

      if (result.success) {
        logger.success(`Transfer ${chunk.index} created: ${result.transfer.id} - Status: ${result.transfer.status}`);
      } else {
        logger.error(`Transfer ${chunk.index} failed: ${result.error}`);

        // Check if this is a critical error that should stop all transfers
        if (this.isCriticalError(result.error)) {
          aborted = true;
          abortReason = result.error;
          logger.error(`CRITICAL ERROR DETECTED: ${result.error}`);
          logger.error(`Stopping all transfers to prevent further failures.`);
          break;
        }
      }

      // Small delay between transfers to avoid rate limiting
      if (chunk.index < chunks.length && !aborted) {
        await this.delay(500);
      }
    }

    return {
      success: !aborted && results.every(r => r.success),
      aborted,
      abortReason,
      totalPlanned: chunks.length,
      totalExecuted: results.length,
      results
    };
  }

  async pollTransferStatuses(results) {
    logger.header('Checking Final Transfer Statuses');

    const finalResults = [];

    for (const result of results) {
      if (!result.success || !result.transfer) {
        finalResults.push({
          ...result,
          finalStatus: 'failed',
          error: result.error || 'Transfer creation failed'
        });
        continue;
      }

      const transferId = result.transfer.id;
      let attempts = 0;
      let finalStatus = result.transfer.status;
      let updatedTransfer = result.transfer;

      // Poll until we get a terminal status or max attempts
      while (this.isPendingStatus(finalStatus) && attempts < MAX_POLL_ATTEMPTS) {
        await this.delay(POLL_INTERVAL_MS);
        attempts++;

        try {
          const transfer = await this.client.getTransfer(transferId);
          finalStatus = transfer.status;
          // Update transfer with new data (transaction_date, post_date, etc.)
          updatedTransfer = { ...updatedTransfer, ...transfer };
          logger.info(`Transfer ${result.index}: ${transferId} - Status: ${finalStatus}`);
        } catch (error) {
          logger.warning(`Failed to poll transfer ${transferId}: ${error.message}`);
        }
      }

      finalResults.push({
        ...result,
        transfer: updatedTransfer,
        finalStatus,
        pollingAttempts: attempts
      });
    }

    return finalResults;
  }

  isPendingStatus(status) {
    return status === 'pending';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  summarizeResults(results) {
    const summary = {
      total: results.length,
      successful: results.filter(r => r.finalStatus === 'succeeded').length,
      pending: results.filter(r => r.finalStatus === 'pending').length,
      failed: results.filter(r => r.finalStatus === 'failed' || r.finalStatus === 'rejected').length,
      totalAmountAttempted: results.reduce((sum, r) => sum + r.amount, 0),
      totalAmountSucceeded: results
        .filter(r => r.finalStatus === 'succeeded')
        .reduce((sum, r) => sum + r.amount, 0)
    };

    logger.header('Transfer Summary');
    logger.info(`Total transfers: ${summary.total}`);
    logger.success(`Successful: ${summary.successful}`);
    if (summary.pending > 0) {
      logger.warning(`Still pending: ${summary.pending}`);
    }
    if (summary.failed > 0) {
      logger.error(`Failed: ${summary.failed}`);
    }
    logger.divider();
    logger.info(`Total amount attempted: $${summary.totalAmountAttempted.toLocaleString('es-CL')} CLP`);
    logger.info(`Total amount succeeded: $${summary.totalAmountSucceeded.toLocaleString('es-CL')} CLP`);

    return summary;
  }
}
