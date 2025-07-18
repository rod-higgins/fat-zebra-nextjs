import type { 
  FatZebraConfig, 
  FatZebraResponse, 
  TransactionResponse, 
  TokenResponse,
  PurchaseRequest,
  AuthorizationRequest,
  CaptureRequest,
  RefundRequest,
  TokenizeRequest,
  WalletRequest
} from './types';

export class FatZebraClient {
  private config: FatZebraConfig;
  private baseUrl: string;

  constructor(config: FatZebraConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 
      (config.isTestMode ? 'https://gateway.pmnts-sandbox.io' : 'https://gateway.pmnts.io');
  }

  private getAuthHeader(): string {
    const credentials = btoa(`${this.config.username}:${this.config.token}`);
    return `Basic ${credentials}`;
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
      'User-Agent': 'FatZebra-NextJS-Library/1.0.0'
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result as FatZebraResponse<T>;
    } catch (error) {
      throw new Error(`Fat Zebra API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Purchase Methods
  async createPurchase(request: PurchaseRequest): Promise<FatZebraResponse<TransactionResponse>> {
    return this.makeRequest<TransactionResponse>('/purchases', 'POST', request);
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
      extra
    };
    
    return this.makeRequest<TransactionResponse>('/purchases', 'POST', request);
  }

  async createPurchaseWithWallet(request: WalletRequest): Promise<FatZebraResponse<TransactionResponse>> {
    return this.makeRequest<TransactionResponse>('/purchases', 'POST', request);
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
    return this.makeRequest<TransactionResponse>('/purchases', 'POST', {
      ...request,
      capture: false
    });
  }

  async captureAuthorization(
    authorizationId: string,
    request?: CaptureRequest
  ): Promise<FatZebraResponse<TransactionResponse>> {
    return this.makeRequest<TransactionResponse>(`/purchases/${authorizationId}/capture`, 'POST', request);
  }

  async releaseAuthorization(authorizationId: string): Promise<FatZebraResponse<any>> {
    return this.makeRequest(`/purchases/${authorizationId}/capture`, 'DELETE');
  }

  // Tokenization Methods
  async tokenizeCard(request: TokenizeRequest): Promise<FatZebraResponse<TokenResponse>> {
    return this.makeRequest<TokenResponse>('/credit_cards', 'POST', request);
  }

  async getToken(tokenId: string): Promise<FatZebraResponse<TokenResponse>> {
    return this.makeRequest<TokenResponse>(`/credit_cards/${tokenId}`);
  }

  async listTokens(
    limit?: number,
    offset?: number
  ): Promise<FatZebraResponse<TokenResponse[]>> {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    
    const queryString = params.toString();
    const endpoint = queryString ? `/credit_cards?${queryString}` : '/credit_cards';
    
    return this.makeRequest<TokenResponse[]>(endpoint);
  }

  // Refund Methods
  async createRefund(
    purchaseId: string,
    request: RefundRequest
  ): Promise<FatZebraResponse<TransactionResponse>> {
    return this.makeRequest<TransactionResponse>('/refunds', 'POST', {
      transaction_id: purchaseId,
      ...request
    });
  }

  async getRefund(refundId: string): Promise<FatZebraResponse<TransactionResponse>> {
    return this.makeRequest<TransactionResponse>(`/refunds/${refundId}`);
  }

  async listRefunds(
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
    const endpoint = queryString ? `/refunds?${queryString}` : '/refunds';
    
    return this.makeRequest<TransactionResponse[]>(endpoint);
  }

  // Void Methods
  async voidPurchase(purchaseId: string): Promise<FatZebraResponse<any>> {
    return this.makeRequest(`/purchases/${purchaseId}/void`, 'POST');
  }

  async voidRefund(refundId: string): Promise<FatZebraResponse<any>> {
    return this.makeRequest(`/refunds/${refundId}/void`, 'POST');
  }
}