export interface FatZebraConfig {
  username: string;
  token: string;
  isTestMode?: boolean;
  baseUrl?: string;
  sharedSecret?: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  scope?: string;
}

export interface CardDetails {
  card_holder: string;
  card_number: string;
  card_expiry: string; // MM/YY format
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
  ip_address?: string;
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
  extra?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface AuthorizationRequest {
  amount: number;
  currency: string;
  reference: string;
  customer_ip?: string;
  customer?: Customer;
  card_details?: CardDetails;
  card_token?: string;
  extra?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface RefundRequest {
  transaction_id?: string;
  reference?: string;
  amount?: number;
  reason?: string;
}

export interface TokenizationRequest {
  card_holder: string;
  card_number: string;
  card_expiry: string;
  cvv: string;
  verification?: string;
}

export interface TransactionResponse {
  id: string;
  successful: boolean;
  response: {
    id: string;
    amount: number;
    currency: string;
    reference: string;
    message: string;
    authorization: string;
    card: {
      token: string;
      display_number: string;
      scheme: string;
      expiry_month: number;
      expiry_year: number;
    };
    settlement: {
      date: string;
    };
    transaction_fee: number;
    acquirer_response: {
      code: string;
      message: string;
    };
  };
  errors?: string[];
  test: boolean;
}

export interface TokenizationResponse {
  successful: boolean;
  response: {
    token: string;
    card_holder: string;
    card_number: string;
    card_expiry: string;
    authorized: boolean;
    transaction_count: number;
  };
  errors?: string[];
  test: boolean;
}

export interface FatZebraResponse<T> {
  successful: boolean;
  response: T;
  errors?: string[];
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
  accessToken?: string;
  username?: string;
  onTokenizationSuccess?: (token: string) => void;
  onScaSuccess?: (event: any) => void;
  onScaError?: (error: any) => void;
  className?: string;
  showAmountField?: boolean;
  requireCustomer?: boolean;
}

export interface UsePaymentOptions {
  enableTokenization?: boolean;
  enable3DS?: boolean;
  accessToken?: string;
  username?: string;
  autoReset?: boolean;
}

export interface UsePaymentResult {
  loading: boolean;
  error: string | null;
  success: boolean;
  processPayment: (data: PaymentFormData) => Promise<any>;
  tokenizeCard: (cardDetails: CardDetails) => Promise<string>;
  verifyCard: (cardDetails: CardDetails) => Promise<boolean>;
  reset: () => void;
}

export interface DirectDebitRequest {
  account_name: string;
  account_number: string;
  bsb: string;
  amount: number;
  currency: string;
  reference: string;
  customer_ip?: string;
  customer?: Customer;
}

export interface WebhookEvent {
  id: string;
  type: string;
  object: string;
  data: {
    id: string;
    amount: number;
    reference: string;
    successful: boolean;
    message: string;
    settlement_date: string;
  };
  created_at: string;
}

export interface VerificationHashData {
  reference: string;
  amount: number;
  currency: string;
  timestamp?: number;
}

export interface Environment {
  sandbox: 'sandbox';
  production: 'production';
}

export interface PaymentEvent {
  type: string;
  data: any;
  timestamp: number;
}

export interface SettlementResponse {
  id: string;
  date: string;
  total_amount: number;
  currency: string;
  transactions: Array<{
    id: string;
    amount: number;
    reference: string;
    type: string;
  }>;
}

export interface BatchRequest {
  requests: Array<PurchaseRequest | AuthorizationRequest | RefundRequest>;
  batch_reference: string;
}

export interface CardValidationResult {
  isValid: boolean;
  cardType: string;
  errors: string[];
}

export interface PaymentFormErrors {
  card_holder?: string;
  card_number?: string;
  card_expiry?: string;
  cvv?: string;
  amount?: string;
  email?: string;
  general?: string;
}

// Constants
export const CARD_TYPES = {
  VISA: 'visa',
  MASTERCARD: 'mastercard',
  AMEX: 'amex',
  DINERS: 'diners',
  DISCOVER: 'discover',
  JCB: 'jcb',
  UNKNOWN: 'unknown'
} as const;

export const CURRENCIES = {
  AUD: 'AUD',
  USD: 'USD',
  NZD: 'NZD',
  GBP: 'GBP',
  EUR: 'EUR',
  CAD: 'CAD',
  SGD: 'SGD',
  HKD: 'HKD',
  JPY: 'JPY'
} as const;

export const TEST_CARDS = {
  VISA_SUCCESS: '4005550000000001',
  VISA_DECLINE: '4005550000000019',
  VISA_3DS_SUCCESS: '4005554444444460',
  MASTERCARD_SUCCESS: '5123456789012346',
  MASTERCARD_DECLINE: '5123456789012353',
  AMEX_SUCCESS: '345678901234564',
  AMEX_DECLINE: '345678901234572',
  DINERS_SUCCESS: '30000000000004',
  DISCOVER_SUCCESS: '6011000000000004'
} as const;

export const TRANSACTION_TYPES = {
  PURCHASE: 'Purchase',
  AUTHORIZATION: 'Authorization',
  CAPTURE: 'Capture',
  REFUND: 'Refund',
  VOID: 'Void'
} as const;

export const TRANSACTION_STATUSES = {
  SUCCESSFUL: 'successful',
  DECLINED: 'declined',
  PENDING: 'pending',
  FAILED: 'failed'
} as const;

export const ERROR_CODES = {
  INVALID_CARD: 'invalid_card',
  EXPIRED_CARD: 'expired_card',
  INSUFFICIENT_FUNDS: 'insufficient_funds',
  INVALID_CVV: 'invalid_cvv',
  FRAUD_DETECTED: 'fraud_detected',
  PROCESSING_ERROR: 'processing_error',
  NETWORK_ERROR: 'network_error',
  CONFIGURATION_ERROR: 'configuration_error'
} as const;

export type CardType = typeof CARD_TYPES[keyof typeof CARD_TYPES];
export type Currency = typeof CURRENCIES[keyof typeof CURRENCIES];
export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES];
export type TransactionStatus = typeof TRANSACTION_STATUSES[keyof typeof TRANSACTION_STATUSES];
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// Export all types
export default {
  CARD_TYPES,
  CURRENCIES,
  TEST_CARDS,
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
  ERROR_CODES
};