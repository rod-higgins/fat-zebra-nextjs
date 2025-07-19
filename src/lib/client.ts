import { createHmac } from 'crypto';
import type { 
  FatZebraConfig, 
  OAuthConfig,
  FatZebraResponse, 
  TransactionResponse, 
  TokenResponse,
  PurchaseRequest,
  AuthorizationRequest,
  CaptureRequest,
  RefundRequest,
  TokenizeRequest,
  WalletRequest,
  FatZebraError
} from '../types';

export class FatZebraClient {
  private config: FatZebraConfig;
  private baseUrl: string;
  private oauthBaseUrl: string;

  constructor(config: FatZebraConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 
      (config.isTestMode ? 'https://gateway.pmnts-sandbox.io' : 'https://gateway.pmnts.io');
    this.oauthBaseUrl = config.isTestMode 
      ? 'https://auth.sandbox.fatzebra.com' 
      : 'https://auth.fatzebra.com';
  }

  private getAuthHeader(): string {
    const credentials = btoa(`${this.config.username}:${this.config.token}`);
    return `Basic ${credentials}`;
  }

  /**
   * Generate OAuth access token for client-side SDK usage
   */
  async generateAccessToken(oauthConfig: OAuthConfig): Promise<string> {
    const url = `${this.oauthBaseUrl}/oauth/token`;
    
    const data = {
      grant_type: 'client_credentials',
      client_id: oauthConfig.clientId,
      client_secret: oauthConfig.clientSecret,
      scope: oauthConfig.scope || 'payments:create'
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(data)
      });

      if (!response.ok) {
        throw new Error(`OAuth token request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result.access_token;
    } catch (error) {
      throw new FatZebraError(
        'Failed to generate access token',
        [error instanceof Error ? error.message : 'Unknown error']
      );
    }
  }

  /**
   * Generate verification hash for secure operations
   */
  generateVerificationHash(data: string): string {
    if (!this.config.sharedSecret) {
      throw new FatZebraError('Shared secret is required for verification hash generation');
    }
    
    return createHmac('md5', this.config.sharedSecret)
      .update(data)
      .digest('hex');
  }

  /**
   * Generate verification hash for new card tokenization
   */
  generateNewCardVerificationHash(reference: string, amount: number, currency: string): string {
    return this.generateVerificationHash(`${reference}:${amount}${currency}`);
  }

  /**
   * Generate verification hash for existing card verification
   */
  generateExistingCardVerificationHash(cardToken: string): string {
    return this.generateVerificationHash(cardToken);
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<FatZebraResponse<T>> {
    const url = `${this.baseUrl}/v1.0${endpoint}`;
    
    const headers: HeadersInit = {
      'Authorization': this.getAuthHeader(),
      'Content-Type': 'application/json',
      'User-Agent': 'FatZebra-NextJS-Library/2.0.0',
      'X-Test-Mode': this.config.isTestMode ? 'true' : 'false'
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ errors: [`HTTP ${response.status}: ${response.statusText}`] }));
        throw new FatZebraError(
          `API request failed`,
          errorData.errors || [`HTTP ${response.status}: ${response.statusText}`],
          errorData
        );
      }

      const result = await response.json();
      return result as FatZebraResponse<T>;
    } catch (error) {
      if (error instanceof FatZebraError) {
        throw error;
      }
      throw new FatZebraError(
        'Fat Zebra API request failed',
        [error instanceof Error ? error.message : 'Unknown error']
      );
    }
  }

  // Purchase Methods
  async createPurchase(request: PurchaseRequest): Promise<FatZebraResponse<TransactionResponse>> {
    const enrichedRequest = {
      ...request,
      test: this.config.isTestMode || false
    };
    return this.makeRequest<TransactionResponse>('/purchases', 'POST', enrichedRequest);
  }

  async createPurchaseWithToken(
    cardToken: string,
    amount: number,
    reference: string,
    currency: string = 'AUD',
    customerIp?: string,
    extra?: any
  ): Promise<FatZebraResponse<TransactionResponse>> {
    const request = {
      card_token: cardToken,
      amount,
      reference,
      currency,
      customer_ip: customerIp,
      extra,
      test: this.config.isTestMode || false
    };
    
    return this.makeRequest<TransactionResponse>('/purchases', 'POST', request);
  }

  async createPurchaseWithWallet(request: WalletRequest): Promise<FatZebraResponse<TransactionResponse>> {
    const enrichedRequest = {
      ...request,
      test: this.config.isTestMode || false
    };
    return this.makeRequest<TransactionResponse>('/purchases', 'POST', enrichedRequest);
  }

  async getPurchase(purchaseId: string): Promise<FatZebraResponse<TransactionResponse>> {
    return this.makeRequest<TransactionResponse>(`/purchases/${purchaseId}`);
  }

  async listPurchases(
    from?: string,
    to?: string,
    limit?: number,
    offset?: number
  ): Promise<FatZebraResponse<TransactionResponse[]>> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    
    const queryString = params.toString();
    const endpoint = queryString ? `/purchases?${queryString}` : '/purchases';
    
    return this.makeRequest<TransactionResponse[]>(endpoint);
  }

  // Authorization Methods
  async createAuthorization(request: AuthorizationRequest): Promise<FatZebraResponse<TransactionResponse>> {
    const enrichedRequest = {
      ...request,
      capture: false,
      test: this.config.isTestMode || false
    };
    return this.makeRequest<TransactionResponse>('/purchases', 'POST', enrichedRequest);
  }

  async captureAuthorization(authId: string, amount?: number): Promise<FatZebraResponse<TransactionResponse>> {
    const request: CaptureRequest = {
      transaction_id: authId,
      ...(amount && { amount })
    };
    return this.makeRequest<TransactionResponse>('/purchases/capture', 'POST', request);
  }

  async voidAuthorization(authId: string): Promise<FatZebraResponse<TransactionResponse>> {
    return this.makeRequest<TransactionResponse>(`/purchases/${authId}/void`, 'POST');
  }

  // Refund Methods
  async createRefund(request: RefundRequest): Promise<FatZebraResponse<TransactionResponse>> {
    const enrichedRequest = {
      ...request,
      test: this.config.isTestMode || false
    };
    return this.makeRequest<TransactionResponse>('/refunds', 'POST', enrichedRequest);
  }

  async getRefund(refundId: string): Promise<FatZebraResponse<TransactionResponse>> {
    return this.makeRequest<TransactionResponse>(`/refunds/${refundId}`);
  }

  // Tokenization Methods
  async createToken(request: TokenizeRequest): Promise<FatZebraResponse<TokenResponse>> {
    const enrichedRequest = {
      ...request,
      test: this.config.isTestMode || false
    };
    return this.makeRequest<TokenResponse>('/credit_cards', 'POST', enrichedRequest);
  }

  async getToken(tokenId: string): Promise<FatZebraResponse<TokenResponse>> {
    return this.makeRequest<TokenResponse>(`/credit_cards/${tokenId}`);
  }

  // Bank Account Methods (Direct Debit)
  async createDirectDebit(request: {
    amount: number;
    reference: string;
    bsb: string;
    account_number: string;
    account_name: string;
    description?: string;
  }): Promise<FatZebraResponse<TransactionResponse>> {
    const enrichedRequest = {
      ...request,
      test: this.config.isTestMode || false
    };
    return this.makeRequest<TransactionResponse>('/direct_debits', 'POST', enrichedRequest);
  }

  // Settlement Methods
  async getSettlements(
    from?: string,
    to?: string
  ): Promise<FatZebraResponse<any[]>> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/settlements?${queryString}` : '/settlements';
    
    return this.makeRequest<any[]>(endpoint);
  }

  // Health Check
  async ping(): Promise<FatZebraResponse<{ ping: string }>> {
    return this.makeRequest<{ ping: string }>('/ping');
  }

  // Webhooks verification
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.sharedSecret) {
      throw new FatZebraError('Shared secret is required for webhook verification');
    }
    
    const expectedSignature = createHmac('sha256', this.config.sharedSecret)
      .update(payload)
      .digest('hex');
    
    return expectedSignature === signature;
  }
}

/**
 * Factory function to create a FatZebra client instance
 */
export function createFatZebraClient(config: FatZebraConfig): FatZebraClient {
  return new FatZebraClient(config);
}

/**
 * Helper function to validate Fat Zebra configuration
 */
export function validateConfig(config: Partial<FatZebraConfig>): config is FatZebraConfig {
  if (!config.username) {
    throw new FatZebraError('Username is required in FatZebra configuration');
  }
  if (!config.token) {
    throw new FatZebraError('Token is required in FatZebra configuration');
  }
  return true;
}