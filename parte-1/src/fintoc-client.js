import { Fintoc } from 'fintoc';
import { logger } from './utils/logger.js';


export class FintocClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.jwsPrivateKeyPath = config.jwsPrivateKeyPath;
    this.FINTOC_API_BASE_URL =  process.env.FINTOC_BASE_URL
    this.accountId = config.accountId;
    this.client = null;
  }

  async initialize() {
    try {
      this.client = new Fintoc(this.apiKey, this.jwsPrivateKeyPath);
      logger.success('Fintoc client initialized successfully');
      return true;
    } catch (error) {
      logger.error(`Failed to initialize Fintoc client: ${error.message}`);
      throw error;
    }
  }

  async createTransfer(transferData) {
    const { amount, counterparty, comment, referenceId, idempotencyKey } = transferData;

    try {
      const transferParams = {
        amount: amount,
        currency: 'clp',
        account_id: this.accountId,
        counterparty: {
          holder_id: counterparty.holderId,
          holder_name: counterparty.holderName,
          account_number: counterparty.accountNumber,
          account_type: counterparty.accountType,
          institution_id: counterparty.institutionId
        },
        comment: comment,
        idempotency_key: idempotencyKey
      };

      // Add reference_id if provided (Mexico only, max 7 digits)
      if (referenceId) {
        transferParams.reference_id = referenceId;
      }

      const transfer = await this.client.v2.transfers.create(transferParams);


      return {
        success: true,
        transfer: {
          id: transfer.id,
          amount: transfer.amount,
          currency: transfer.currency,
          status: transfer.status,
          comment: transfer.comment,
          transactionDate: transfer.transaction_date || transfer.transactionDate,
          postDate: transfer.post_date || transfer.postDate,
          referenceId: transfer.reference_id || transfer.referenceId,
          mode: transfer.mode
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        amount: amount,
        comment: comment
      };
    }
  }

  async getTransfer(transferId) {
    try {
      const transfer = await this.client.v2.transfers.get(transferId);


      return {
        id: transfer.id,
        amount: transfer.amount,
        currency: transfer.currency,
        status: transfer.status,
        comment: transfer.comment,
        transactionDate: transfer.transaction_date || transfer.transactionDate,
        postDate: transfer.post_date || transfer.postDate,
        referenceId: transfer.reference_id || transfer.referenceId,
        mode: transfer.mode
      };
    } catch (error) {
      logger.error(`Failed to get transfer ${transferId}: ${error.message}`);
      throw error;
    }
  }

  async listTransfers(options = {}) {
    try {
      const transfers = await this.client.v2.transfers.list({
        account_id: this.accountId,
        direction: 'outbound',
        ...options
      });
      return transfers;
    } catch (error) {
      logger.error(`Failed to list transfers: ${error.message}`);
      throw error;
    }
  }

  async getAccounts() {
    try {
      const accounts = await this.client.v2.accounts.list();
      return accounts;
    } catch (error) {
      logger.error(`Failed to get accounts: ${error.message}`);
      throw error;
    }
  }

  async getAccountBalance() {
    try {
      const account = await this.client.v2.accounts.get(this.accountId);

      // Treasury API returns available_balance directly on account object
      const available = account.available_balance ?? account.availableBalance ?? 0;
      const holderName = account.entity?.holder_name ?? account.entity?.holderName ?? 'Unknown';

      return {
        success: true,
        accountId: account.id,
        balance: {
          available,
          current: available // Treasury API only has available_balance
        },
        currency: account.currency || 'CLP',
        name: holderName
      };
    } catch (error) {
      logger.error(`Failed to get account balance: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getAccountDetails() {
    try {
      const account = await this.client.v2.accounts.get(this.accountId);

      // Treasury API format
      const available = account.available_balance ?? account.availableBalance ?? 0;
      const holderName = account.entity?.holder_name ?? account.entity?.holderName ?? 'Unknown';
      const accountNumberId = account.root_account_number_id ?? account.rootAccountNumberId ?? null;

      return {
        success: true,
        accountId: account.id,
        accountNumberId,
        balance: {
          available,
          current: available
        },
        currency: account.currency || 'CLP',
        name: holderName,
        mode: account.mode || 'unknown'
      };
    } catch (error) {
      logger.error(`Failed to get account details: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getAccountNumbers() {
    try {
      // Use direct API call to get account numbers
      const response = await fetch(`${this.FINTOC_API_BASE_URL}/account_numbers?account_id=${this.accountId}`, {
        method: 'GET',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const accountNumbers = await response.json();
      return {
        success: true,
        accountNumbers: accountNumbers
      };
    } catch (error) {
      logger.error(`Failed to get account numbers: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async simulateDeposit(amount) {
    try {
      // First get account numbers to find the account_number_id
      logger.info('Getting account numbers...');
      const accountNumbersResult = await this.getAccountNumbers();

      if (!accountNumbersResult.success) {
        return {
          success: false,
          error: `Failed to get account numbers: ${accountNumbersResult.error}`
        };
      }

      if (!accountNumbersResult.accountNumbers || accountNumbersResult.accountNumbers.length === 0) {
        return {
          success: false,
          error: 'No account number found for this account. Cannot simulate deposit.'
        };
      }

      const accountNumberId = accountNumbersResult.accountNumbers[0].id;

      logger.info(`Simulating deposit of $${amount.toLocaleString('es-CL')} CLP...`);
      logger.info(`Account Number ID: ${accountNumberId}`);

      // Call the simulate receive transfer endpoint directly via HTTP
      const response = await fetch(`${this.FINTOC_API_BASE_URL}/simulate/receive_transfer`, {
        method: 'POST',
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          account_number_id: accountNumberId,
          amount: amount,
          currency: 'clp'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      const result = await response.json().catch(() => ({}));

      // Wait a moment for the balance to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get updated balance
      const updatedAccount = await this.getAccountDetails();

      return {
        success: true,
        status: result?.status || 'succeeded',
        amountDeposited: amount,
        newBalance: updatedAccount.success ? updatedAccount.balance : null,
        transfer: result
      };
    } catch (error) {
      logger.error(`Failed to simulate deposit: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  isTestMode() {
    return this.apiKey && this.apiKey.startsWith('sk_test_');
  }
}
