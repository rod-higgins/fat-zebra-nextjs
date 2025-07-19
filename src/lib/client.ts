/**
 * Fat Zebra Next.js Package - Client Implementation
 * Complete client implementation with proper TypeScript and error handling
 */

import type {
  FatZebraConfig,
  PurchaseRequest,
  AuthorizationRequest,
  RefundRequest,
  TokenizationRequest,
  FatZebraResponse,
  TransactionResponse,
  TokenizationResponse,
  VerificationHashData,
  SettlementResponse
} from '../types';

import { FatZebraError, TEST_CARDS, CURRENCIES } from '../types';

// Constants
const DEFAULT_GATEWAY_URL = 'https://gateway.fatzebra.com.au';
const DEFAULT_SANDBOX_URL = 'https://gateway.sandbox.fatzebra.com.au';
const DEFAULT_API_VERSION = 'v1.0';
const DEFAULT_TIMEOUT = 30000;

/**
 * Fat Zebra API Client
 */
export class FatZebraClient {
  private config: Required<FatZebraConfig>;

  constructor(config: FatZebraConfig) {
    this.config = {
      username: config.username,
      token: config.token,
      isTestMode: config.isTestMode ?? true,
      gatewayUrl: config.gatewayUrl ?? (config.isTestMode ? DEFAULT_SANDBOX_URL : DEFAULT_GATEWAY_URL),
      apiVersion: config.apiVersion ?? DEFAULT_API_VERSION,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
    };

    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.username) {
      throw new FatZebraError('Username is required');
    }
    if (!this.config.token) {
      throw new FatZebraError('Token is required');
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const credentials = Buffer.from(`${this.config.username}:${this.config.token}`).toString('base64');
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': '@fwc/fat-zebra-nextjs/2.0.0',
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
    data?: any
  ): Promise<FatZebraResponse<T>> {
    const url = `${this.config.gatewayUrl}/${this.config.apiVersion}/${endpoint}`;
    
    const requestOptions: RequestInit = {
      method,
      headers: this.getAuthHeaders(),
      signal: AbortSignal.timeout(this.config.timeout),
    };

    if (data && method !== 'GET') {
      requestOptions.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, requestOptions);
      const responseData = await response.json();

      if (!response.ok) {
        throw new FatZebraError(
          responseData.message || 'Request failed',
          responseData.errors || [`HTTP ${response.status}: ${response.statusText}`],
          responseData
        );
      }

      return responseData;
    } catch (error) {
      if (error instanceof FatZebraError) {
        throw error;
      }
      
      if (error instanceof Error) {
        throw new FatZebraError(
          `Network error: ${error.message}`,
          [error.message]
        );
      }
      
      throw new FatZebraError(
        'Unknown error occurred',
        ['An unexpected error occurred during the request']
      );
    }
  }

  /**
   * Create a purchase transaction
   */
  async createPurchase(request: PurchaseRequest): Promise<FatZebraResponse<TransactionResponse>> {
    this.validatePurchaseRequest(request);
    return this.makeRequest<TransactionResponse>('purchases', 'POST', request);
  }

  /**
   * Create an authorization transaction
   */
  async createAuthorization(request: AuthorizationRequest): Promise<FatZebraResponse<TransactionResponse>> {
    this.validateAuthorizationRequest(request);
    return this.makeRequest<TransactionResponse>('authorizations', 'POST', request);
  }

  /**
   * Capture an authorized transaction
   */
  async captureAuthorization(transactionId: string, amount?: number): Promise<FatZebraResponse<TransactionResponse>> {
    if (!transactionId) {
      throw new FatZebraError('Transaction ID is required');
    }

    const data = amount ? { amount } : {};
    return this.makeRequest<TransactionResponse>(`authorizations/${transactionId}/capture`, 'POST', data);
  }

  /**
   * Refund a transaction
   */
  async createRefund(request: RefundRequest): Promise<FatZebraResponse<TransactionResponse>> {
    this.validateRefundRequest(request);
    return this.makeRequest<TransactionResponse>('refunds', 'POST', request);
  }

  /**
   * Tokenize a card
   */
  async tokenizeCard(request: TokenizationRequest): Promise<FatZebraResponse<TokenizationResponse>> {
    this.validateTokenizationRequest(request);
    return this.makeRequest<TokenizationResponse>('credit_cards', 'POST', request);
  }

  /**
   * Get transaction details
   */
  async getTransaction(transactionId: string): Promise<FatZebraResponse<TransactionResponse>> {
    if (!transactionId) {
      throw new FatZebraError('Transaction ID is required');
    }
    return this.makeRequest<TransactionResponse>(`purchases/${transactionId}`, 'GET');
  }

  /**
   * Get settlement details
   */
  async getSettlement(settlementId: string): Promise<FatZebraResponse<SettlementResponse>> {
    if (!settlementId) {
      throw new FatZebraError('Settlement ID is required');
    }
    return this.makeRequest<SettlementResponse>(`settlements/${settlementId}`, 'GET');
  }

  // Validation methods
  private validatePurchaseRequest(request: PurchaseRequest): void {
    if (!request.amount || request.amount <= 0) {
      throw new FatZebraError('Valid amount is required');
    }
    if (!request.currency) {
      throw new FatZebraError('Currency is required');
    }
    if (!request.reference) {
      throw new FatZebraError('Reference is required');
    }
    if (!request.card_details) {
      throw new FatZebraError('Card details are required');
    }
    this.validateCardDetails(request.card_details);
  }

  private validateAuthorizationRequest(request: AuthorizationRequest): void {
    this.validatePurchaseRequest(request); // Same validation as purchase
  }

  private validateRefundRequest(request: RefundRequest): void {
    if (!request.transaction_id) {
      throw new FatZebraError('Transaction ID is required');
    }
    if (request.amount && request.amount <= 0) {
      throw new FatZebraError('Refund amount must be greater than 0');
    }
  }

  private validateTokenizationRequest(request: TokenizationRequest): void {
    if (!request.card_details) {
      throw new FatZebraError('Card details are required');
    }
    this.validateCardDetails(request.card_details);
  }

  private validateCardDetails(cardDetails: any): void {
    if (!cardDetails.card_holder || cardDetails.card_holder.trim().length === 0) {
      throw new FatZebraError('Card holder name is required');
    }
    if (!cardDetails.card_number || cardDetails.card_number.trim().length === 0) {
      throw new FatZebraError('Card number is required');
    }
    if (!cardDetails.card_expiry || cardDetails.card_expiry.trim().length === 0) {
      throw new FatZebraError('Card expiry is required');
    }
    if (!cardDetails.cvv || cardDetails.cvv.trim().length === 0) {
      throw new FatZebraError('CVV is required');
    }
  }
}

/**
 * Factory function to create Fat Zebra client
 */
export function createFatZebraClient(config: FatZebraConfig): FatZebraClient {
  return new FatZebraClient(config);
}

/**
 * Response handler utility
 */
export function handleFatZebraResponse<T>(response: FatZebraResponse<T>): T {
  if (!response.successful) {
    throw new FatZebraError(
      'Transaction failed',
      response.errors || ['Transaction was not successful'],
      response
    );
  }
  return response.response;
}

/**
 * Generate verification hash for webhooks
 */
export function generateVerificationHash(data: VerificationHashData, secret: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const crypto = require('crypto');
      const payload = `${data.amount}${data.currency}${data.reference}${data.card_token || ''}${data.timestamp}`;
      const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      resolve(hash);
    } catch (error) {
      reject(new FatZebraError(
        'Failed to generate verification hash',
        [error instanceof Error ? error.message : 'Unknown error']
      ));
    }
  });
}

// Re-export types and constants for convenience
export { FatZebraError, TEST_CARDS, CURRENCIES };
export type { 
  FatZebraConfig, 
  PurchaseRequest, 
  AuthorizationRequest, 
  RefundRequest, 
  TokenizationRequest,
  FatZebraResponse, 
  TransactionResponse, 
  TokenizationResponse 
};