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

// Use dynamic import for crypto to handle both Node.js and browser environments
const getCrypto = async () => {
  if (typeof window !== 'undefined') {
    // Browser environment - use Web Crypto API
    return window.crypto;
  } else {
    // Node.js environment
    const crypto = await import('crypto');
    return crypto;
  }
};

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
      'User-Agent': '@fwc/fat-zebra-nextjs/0.2.1' 
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
      
      // Handle network and other errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new FatZebraError(
        errorMessage,
        [errorMessage],
        'NETWORK_ERROR'
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
    const request: PurchaseRequest = {
      amount,
      currency,
      reference,
      card_token: cardToken,
      customer_ip: customerIp,
      extra
    };

    return this.createPurchase(request);
  }

  async getPurchase(purchaseId: string): Promise<FatZebraResponse<TransactionResponse>> {
    return this.makeRequest<TransactionResponse>(`purchases/${purchaseId}`, 'GET');
  }

  async searchPurchases(params?: Record<string, any>): Promise<FatZebraResponse<TransactionResponse[]>> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.makeRequest<TransactionResponse[]>(`purchases${queryString}`, 'GET');
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
    const data = amount ? { amount } : {};
    return this.makeRequest<TransactionResponse>(`purchases/${authorizationId}/capture`, 'POST', data);
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

  async searchRefunds(params?: Record<string, any>): Promise<FatZebraResponse<TransactionResponse[]>> {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.makeRequest<TransactionResponse[]>(`refunds${queryString}`, 'GET');
  }

  // Tokenization Methods
  async tokenizeCard(request: TokenizationRequest): Promise<FatZebraResponse<TokenizationResponse>> {
    return this.makeRequest<TokenizationResponse>('credit_cards', 'POST', request);
  }

  async getCardToken(token: string): Promise<FatZebraResponse<TokenizationResponse>> {
    return this.makeRequest<TokenizationResponse>(`credit_cards/${token}`, 'GET');
  }

  async deleteCardToken(token: string): Promise<FatZebraResponse<{ deleted: boolean }>> {
    return this.makeRequest<{ deleted: boolean }>(`credit_cards/${token}`, 'DELETE');
  }

  // Verification Hash Generation
  async generateVerificationHash(data: VerificationHashData): Promise<string> {
    if (!this.sharedSecret) {
      throw new Error('Shared secret is required for verification hash generation');
    }

    const timestamp = data.timestamp || Date.now();
    const hashString = `${data.reference}${data.amount}${data.currency}${timestamp}${this.sharedSecret}`;
    
    try {
      if (typeof window !== 'undefined') {
        // Browser environment - use Web Crypto API
        const encoder = new TextEncoder();
        const key = await window.crypto.subtle.importKey(
          'raw',
          encoder.encode(this.sharedSecret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const signature = await window.crypto.subtle.sign('HMAC', key, encoder.encode(hashString));
        return Array.from(new Uint8Array(signature))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      } else {
        // Node.js environment
        const crypto = await import('crypto');
        return crypto.createHmac('sha256', this.sharedSecret).update(hashString).digest('hex');
      }
    } catch (error) {
      throw new FatZebraError('Failed to generate verification hash', [], 'HASH_GENERATION_ERROR');
    }
  }

  // Webhook Verification
  async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    if (!this.sharedSecret) {
      throw new Error('Shared secret is required for webhook verification');
    }

    try {
      if (typeof window !== 'undefined') {
        // Browser environment
        const encoder = new TextEncoder();
        const key = await window.crypto.subtle.importKey(
          'raw',
          encoder.encode(this.sharedSecret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const expectedSignatureBuffer = await window.crypto.subtle.sign('HMAC', key, encoder.encode(payload));
        const expectedSignature = Array.from(new Uint8Array(expectedSignatureBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        
        return expectedSignature === signature;
      } else {
        // Node.js environment
        const crypto = await import('crypto');
        const expectedSignature = crypto.createHmac('sha256', this.sharedSecret).update(payload).digest('hex');
        return crypto.timingSafeEqual(
          Buffer.from(signature, 'hex'),
          Buffer.from(expectedSignature, 'hex')
        );
      }
    } catch (error) {
      return false;
    }
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
  MASTERCARD_DECLINE: '5123456789012361',
  AMEX_SUCCESS: '345678901234564',
  AMEX_DECLINE: '345678901234572'
} as const;