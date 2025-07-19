import {
  FatZebraConfig,
  PurchaseRequest,
  AuthorizationRequest,
  RefundRequest,
  TokenizationRequest,
  FatZebraResponse,
  TransactionResponse,
  TokenizationResponse,
  OAuthConfig,
  VerificationHashData,
  WebhookEvent,
  SettlementResponse
} from '../types';
import { createHmac } from 'crypto';

export class FatZebraError extends Error {
  public errors: string[];
  public code?: string;

  constructor(message: string, errors: string[] = [], code?: string) {
    super(message);
    this.name = 'FatZebraError';
    this.errors = errors;
    this.code = code;
  }
}

export class FatZebraClient {
  private username: string;
  private token: string;
  private baseUrl: string;
  private sharedSecret?: string;

  constructor(config: FatZebraConfig) {
    this.username = config.username;
    this.token = config.token;
    this.sharedSecret = config.sharedSecret;
    
    // Set base URL based on test mode
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    } else {
      this.baseUrl = config.isTestMode !== false 
        ? 'https://gateway.pmnts-sandbox.io'
        : 'https://gateway.pmnts.io';
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const credentials = btoa(`${this.username}:${this.token}`);
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'User-Agent': '@fwc/fat-zebra-nextjs/0.2.0'
    };
  }

  private async makeRequest<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST', 
    data?: any
  ): Promise<FatZebraResponse<T>> {
    const url = `${this.baseUrl}/v1.0/${endpoint}`;
    
    const requestOptions: RequestInit = {
      method,
      headers: this.getAuthHeaders(),
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      requestOptions.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, requestOptions);
      const result = await response.json();
      
      if (!response.ok) {
        throw new FatZebraError(
          result.message || 'Request failed',
          result.errors || [],
          response.status.toString()
        );
      }

      return result;
    } catch (error) {
      if (error instanceof FatZebraError) {
        throw error;
      }
      throw new FatZebraError(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  // OAuth Methods
  async generateAccessToken(config: OAuthConfig): Promise<{ access_token: string; expires_in: number }> {
    const tokenUrl = `${this.baseUrl}/oauth/token`;
    
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: config.scope || 'api'
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': '@fwc/fat-zebra-nextjs/0.2.0'
        },
        body: body.toString()
      });

      if (!response.ok) {
        const error = await response.json();
        throw new FatZebraError(
          'OAuth token generation failed',
          [error.error_description || error.error || 'Unknown OAuth error']
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof FatZebraError) {
        throw error;
      }
      throw new FatZebraError(
        'OAuth token generation failed',
        [error instanceof Error ? error.message : 'Unknown error']
      );
    }
  }

  // Purchase Methods
  async createPurchase(request: PurchaseRequest): Promise<FatZebraResponse<TransactionResponse>> {
    return this.makeRequest<TransactionResponse>('purchases', 'POST', request);
  }

  async createPurchaseWithToken(
    cardToken: string,
    amount: number,
    reference: string,
    currency: string = 'AUD',
    customerIp?: string,
    extra?: any
  ): Promise<FatZebraResponse<TransactionResponse>> {
    const purchaseData: PurchaseRequest = {
      card_token: cardToken,
      amount,
      reference,
      currency,
      customer_ip: customerIp,
      extra
    };

    return this.createPurchase(purchaseData);
  }

  async getPurchase(purchaseId: string): Promise<FatZebraResponse<TransactionResponse>> {
    return this.makeRequest<TransactionResponse>(`purchases/${purchaseId}`, 'GET');
  }

  // Authorization Methods
  async createAuthorization(request: AuthorizationRequest): Promise<FatZebraResponse<TransactionResponse>> {
    return this.makeRequest<TransactionResponse>('purchases', 'POST', {
      ...request,
      capture: false
    });
  }

  async captureAuthorization(
    authorizationId: string,
    amount?: number
  ): Promise<FatZebraResponse<TransactionResponse>> {
    const captureData = amount ? { amount } : {};
    return this.makeRequest<TransactionResponse>(`purchases/${authorizationId}/capture`, 'POST', captureData);
  }

  async voidAuthorization(authorizationId: string): Promise<FatZebraResponse<TransactionResponse>> {
    return this.makeRequest<TransactionResponse>(`purchases/${authorizationId}/void`, 'POST');
  }

  // Refund Methods
  async createRefund(request: RefundRequest): Promise<FatZebraResponse<TransactionResponse>> {
    return this.makeRequest<TransactionResponse>('refunds', 'POST', request);
  }

  async getRefund(refundId: string): Promise<FatZebraResponse<TransactionResponse>> {
    return this.makeRequest<TransactionResponse>(`refunds/${refundId}`, 'GET');
  }

  // Tokenization Methods
  async createToken(request: TokenizationRequest): Promise<FatZebraResponse<TokenizationResponse>> {
    return this.makeRequest<TokenizationResponse>('credit_cards', 'POST', request);
  }

  async getToken(tokenId: string): Promise<FatZebraResponse<TokenizationResponse>> {
    return this.makeRequest<TokenizationResponse>(`credit_cards/${tokenId}`, 'GET');
  }

  // Verification Hash Generation
  generateVerificationHash(data: VerificationHashData): string {
    if (!this.sharedSecret) {
      throw new FatZebraError('Shared secret is required for verification hash generation');
    }

    const timestamp = data.timestamp || Math.floor(Date.now() / 1000);
    const hashString = `${data.reference}${data.amount}${data.currency}${timestamp}`;
    
    return createHmac('sha256', this.sharedSecret)
      .update(hashString)
      .digest('hex');
  }

  // Webhook Verification
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.sharedSecret) {
      throw new FatZebraError('Shared secret is required for webhook verification');
    }

    const expectedSignature = createHmac('sha256', this.sharedSecret)
      .update(payload)
      .digest('hex');

    return expectedSignature === signature;
  }

  // Settlement Methods
  async getSettlements(date?: string): Promise<FatZebraResponse<SettlementResponse[]>> {
    const endpoint = date ? `settlements?date=${date}` : 'settlements';
    return this.makeRequest<SettlementResponse[]>(endpoint, 'GET');
  }

  async getSettlement(settlementId: string): Promise<FatZebraResponse<SettlementResponse>> {
    return this.makeRequest<SettlementResponse>(`settlements/${settlementId}`, 'GET');
  }

  // Batch Processing
  async processBatch(requests: any[], batchReference: string): Promise<FatZebraResponse<any>> {
    return this.makeRequest('batch', 'POST', {
      requests,
      batch_reference: batchReference
    });
  }

  // Health Check
  async ping(): Promise<FatZebraResponse<{ message: string }>> {
    return this.makeRequest<{ message: string }>('ping', 'GET');
  }
}

// Factory function for creating client instances
export function createFatZebraClient(config: FatZebraConfig): FatZebraClient {
  return new FatZebraClient(config);
}

// Response handler utility
export function handleFatZebraResponse<T>(response: FatZebraResponse<T>): T {
  if (!response.successful) {
    throw new FatZebraError(
      'Transaction failed',
      response.errors || ['Unknown error']
    );
  }

  return response.response;
}

// Test card constants
export const TEST_CARDS = {
  VISA_SUCCESS: '4005550000000001',
  VISA_3DS_SUCCESS: '4005554444444460',
  VISA_DECLINE: '4005550000000019',
  MASTERCARD_SUCCESS: '5123456789012346',
  MASTERCARD_3DS_SUCCESS: '5123456789012353',
  MASTERCARD_DECLINE: '5123456789012353',
  AMEX_SUCCESS: '345678901234564',
  AMEX_DECLINE: '345678901234572'
} as const;