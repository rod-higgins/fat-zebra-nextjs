// Re-export types from @fat-zebra/sdk
export {
  Environment,
  Payment,
  PaymentIntent,
  PaymentConfig,
  PublicEvent,
  Handlers
} from '@fat-zebra/sdk/dist';

// Enhanced library-specific types
export interface FatZebraConfig {
  username: string;
  token: string;
  isTestMode?: boolean;
  baseUrl?: string;
  sharedSecret?: string; // Required for verification hash generation
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  scope?: string;
}

export interface CardDetails {
  card_holder: string;
  card_number: string;
  card_expiry: string;
  cvv: string;
}

export interface Customer {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export interface PurchaseRequest {
  amount: number;
  currency: string;
  reference: string;
  customer_ip?: string;
  customer?: Customer;
  card_details?: CardDetails;
  card_token?: string;
  capture?: boolean;
  extra?: any;
}

export interface AuthorizationRequest extends Omit<PurchaseRequest, 'capture'> {
  // Authorization doesn't need capture flag
}

export interface CaptureRequest {
  transaction_id: string;
  amount?: number;
  reference?: string;
}

export interface RefundRequest {
  transaction_id: string;
  amount: number;
  reference: string;
  reason?: string;
}

export interface TokenizeRequest {
  card_holder: string;
  card_number: string;
  card_expiry: string;
  cvv: string;
  verification_hash: string; // Required for secure tokenization
}

export interface WalletRequest {
  amount: number;
  currency: string;
  reference: string;
  wallet_type: 'apple_pay' | 'google_pay' | 'samsung_pay';
  wallet_data: any;
  customer_ip?: string;
  customer?: Customer;
}

export interface TransactionResponse {
  id: string;
  amount: number;
  currency: string;
  reference: string;
  message: string;
  authorization: string;
  card_holder: string;
  card_number: string;
  card_type: string;
  successful: boolean;
  response_code: string;
  settlement_date: string;
  transaction_id: string;
  rrn: string;
  cvv_match: string;
  fraud_result?: any;
  three_d_secure?: {
    xid: string;
    cavv: string;
    eci: string;
    enrolled: boolean;
    authenticated: boolean;
  };
}

export interface TokenResponse {
  token: string;
  card_holder: string;
  card_number: string;
  card_type: string;
  expiry_date: string;
}

export interface FatZebraResponse<T = any> {
  successful: boolean;
  response: T;
  errors: string[];
  test: boolean;
}

export interface PaymentFormData {
  amount: number;
  currency: string;
  reference: string;
  cardDetails: CardDetails;
  customer?: Customer;
}

export interface PaymentFormProps {
  onSubmit: (data: PaymentFormData) => Promise<void>;
  amount?: number;
  currency?: string;
  loading?: boolean;
  enableTokenization?: boolean;
  enable3DS?: boolean;
  onTokenizationSuccess?: (token: string) => void;
  onScaSuccess?: (event: any) => void;
  onScaError?: (event: any) => void;
  className?: string;
  accessToken?: string; // Required for latest SDK
  username?: string; // Required for latest SDK
}

export interface UsePaymentOptions {
  enableTokenization?: boolean;
  enable3DS?: boolean;
  accessToken?: string;
  username?: string;
}

export interface PaymentHookResult {
  loading: boolean;
  error: string | null;
  success: boolean;
  processPayment: (paymentData: PaymentFormData) => Promise<any>;
  tokenizeCard: (cardData: CardDetails) => Promise<string>;
  verifyCard: (cardToken: string) => Promise<boolean>;
  reset: () => void;
}

// Error handling
export class FatZebraError extends Error {
  errors: string[];
  response?: any;

  constructor(message: string, errors: string[] = [], response?: any) {
    super(message);
    this.name = 'FatZebraError';
    this.errors = errors;
    this.response = response;
  }
}

// Utility function to handle Fat Zebra API responses
export function handleFatZebraResponse<T>(response: FatZebraResponse<T>): T {
  if (!response.successful) {
    throw new FatZebraError(
      'Transaction failed',
      response.errors || [],
      response
    );
  }
  return response.response;
}

// Constants
export const CURRENCIES = {
  AUD: 'AUD',
  USD: 'USD',
  NZD: 'NZD',
  GBP: 'GBP',
  EUR: 'EUR'
} as const;

export const TEST_CARDS = {
  VISA_SUCCESS: '4005550000000001',
  VISA_DECLINE: '4005550000000019',
  VISA_3DS_SUCCESS: '4005554444444460',
  MASTERCARD_SUCCESS: '5123456789012346',
  MASTERCARD_DECLINE: '5123456789012353',
  MASTERCARD_3DS_SUCCESS: '5123454444444411',
  AMEX_SUCCESS: '345678901234564',
  AMEX_DECLINE: '345678901234572'
} as const;

export const CARD_TYPES = {
  VISA: 'visa',
  MASTERCARD: 'mastercard',
  AMEX: 'amex',
  DINERS: 'diners',
  DISCOVER: 'discover',
  JCB: 'jcb'
} as const;

export type Currency = typeof CURRENCIES[keyof typeof CURRENCIES];
export type CardType = typeof CARD_TYPES[keyof typeof CARD_TYPES];