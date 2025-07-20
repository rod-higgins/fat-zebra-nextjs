/**
 * Fat Zebra Client Library
 * Handles communication with the Fat Zebra payment gateway
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
} from '../types';

import { FatZebraError } from '../types';

export class FatZebraClient {
  private config: Required<FatZebraConfig>;
  private baseUrl: string;

  constructor(config: FatZebraConfig) {
    this.config = {
      username: config.username,
      token: config.token,
      sandbox: config.sandbox ?? true,
      gatewayUrl:
        config.gatewayUrl ??
        (config.sandbox
          ? 'https://gateway.sandbox.fatzebra.com.au'
          : 'https://gateway.fatzebra.com.au'),
      timeout: config.timeout ?? 30000,
    };

    this.baseUrl = `${this.config.gatewayUrl}/v1.0`;
  }

  /**
   * Process a purchase transaction
   */
  async purchase(data: PurchaseRequest): Promise<FatZebraResponse<TransactionResponse>> {
    return this.makeRequest<TransactionResponse>('POST', '/purchases', data);
  }

  /**
   * Process an authorization transaction
   */
  async authorize(data: AuthorizationRequest): Promise<FatZebraResponse<TransactionResponse>> {
    return this.makeRequest<TransactionResponse>('POST', '/purchases', {
      ...data,
      capture: false,
    });
  }

  /**
   * Capture a previously authorized transaction
   */
  async capture(
    transactionId: string,
    amount?: number
  ): Promise<FatZebraResponse<TransactionResponse>> {
    const data = amount ? { amount: Math.round(amount * 100) } : {};
    return this.makeRequest<TransactionResponse>(
      'POST',
      `/purchases/${transactionId}/capture`,
      data
    );
  }

  /**
   * Process a refund transaction
   */
  async refund(data: RefundRequest): Promise<FatZebraResponse<TransactionResponse>> {
    return this.makeRequest<TransactionResponse>('POST', '/refunds', {
      ...data,
      amount: data.amount ? Math.round(data.amount * 100) : undefined,
    });
  }

  /**
   * Tokenize a card
   */
  async tokenize(data: TokenizationRequest): Promise<FatZebraResponse<TokenizationResponse>> {
    return this.makeRequest<TokenizationResponse>('POST', '/credit_cards', data);
  }

  /**
   * Get transaction details
   */
  async getTransaction(transactionId: string): Promise<FatZebraResponse<TransactionResponse>> {
    return this.makeRequest<TransactionResponse>('GET', `/purchases/${transactionId}`);
  }

  /**
   * Void a transaction
   */
  async void(transactionId: string): Promise<FatZebraResponse<TransactionResponse>> {
    return this.makeRequest<TransactionResponse>('POST', `/purchases/${transactionId}/void`);
  }

  /**
   * Create a timeout signal that's compatible with older Node.js versions
   */
  private createTimeoutSignal(timeoutMs: number): AbortSignal {
    // Try to use AbortSignal.timeout if available (Node.js 16.14.0+)
    if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
      return (AbortSignal as any).timeout(timeoutMs);
    }

    // Fallback for older Node.js versions or Jest environments
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    return controller.signal;
  }

  /**
   * Make HTTP request to Fat Zebra API
   */
  private async makeRequest<T>(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<FatZebraResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${this.config.username}:${this.config.token}`).toString(
        'base64'
      )}`,
      'User-Agent': 'FatZebra Next.js v0.5.7',
    };

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: this.createTimeoutSignal(this.config.timeout),
    };

    if (data && method !== 'GET') {
      requestOptions.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, requestOptions);
      const responseData = await response.json();

      if (!response.ok) {
        throw new FatZebraError(
          responseData.errors?.join(', ') || `HTTP ${response.status}`,
          responseData.errors || [],
          responseData
        );
      }

      return {
        successful: responseData.successful || false,
        response: responseData.response,
        errors: responseData.errors,
        test: responseData.test,
      };
    } catch (error) {
      if (error instanceof FatZebraError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new FatZebraError('Request timeout', ['Request timed out']);
        }

        throw new FatZebraError(`Network error: ${error.message}`, [error.message]);
      }

      throw new FatZebraError('Unknown error occurred', ['Unknown error']);
    }
  }
}

/**
 * Create a Fat Zebra client instance
 */
export function createFatZebraClient(config: FatZebraConfig): FatZebraClient {
  return new FatZebraClient(config);
}

/**
 * Handle Fat Zebra API response
 */
export function handleFatZebraResponse<T>(response: FatZebraResponse<T>): FatZebraResponse<T> {
  if (!response.successful && response.errors?.length) {
    throw new FatZebraError(response.errors[0], response.errors, response);
  }

  return response;
}

// Export error class for convenience
export { FatZebraError };
