/**
 * Fat Zebra Next.js Package - Type Definitions
 * Complete type definitions for the Fat Zebra payment gateway
 */

// Core Configuration Types
export interface FatZebraConfig {
  username: string;
  token: string;
  isTestMode?: boolean;
  gatewayUrl?: string;
  apiVersion?: string;
  timeout?: number;
}

// Card and Payment Types
export interface CardDetails {
  card_holder: string;
  card_number: string;
  card_expiry: string;
  cvv: string;
}

export interface Customer {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

// Request Types
export interface PurchaseRequest {
  amount: number;
  currency: string;
  reference: string;
  card_details?: CardDetails;
  customer?: Customer;
  metadata?: Record<string, any>;
}

export interface AuthorizationRequest {
  amount: number;
  currency: string;
  reference: string;
  card_details?: CardDetails;
  customer?: Customer;
  metadata?: Record<string, any>;
}

export interface RefundRequest {
  transaction_id: string;
  amount?: number;
  reference?: string;
  reason?: string;
}

export interface TokenizationRequest {
  card_details: CardDetails;
  customer?: Customer;
}

// Response Types
export interface FatZebraResponse<T = any> {
  successful: boolean;
  response: T;
  errors: string[];
  test: boolean;
}

export interface TransactionResponse {
  id: string;
  amount: number;
  currency: string;
  reference: string;
  authorization: string;
  successful: boolean;
  message: string;
  card_holder: string;
  card_number: string;
  card_type: string;
  settlement_date?: string;
  metadata?: Record<string, any>;
}

export interface TokenizationResponse {
  token: string;
  card_holder: string;
  card_number: string;
  card_type: string;
  expiry_date: string;
}

export interface SettlementResponse {
  id: string;
  batch_id: string;
  amount: number;
  currency: string;
  settled_at: string;
  transactions: TransactionResponse[];
}

// Validation Types
export interface CardValidationResult {
  valid: boolean;
  errors: string[];
  type?: string;
}

// Hook Types
export interface UsePaymentOptions {
  username?: string;
  token?: string;
  isTestMode?: boolean;
  enableTokenization?: boolean;
}

export interface UsePaymentResult {
  isLoading: boolean;
  error: string | null;
  processPayment: (data: PaymentFormData) => Promise<TransactionResponse>;
  tokenizeCard: (cardDetails: CardDetails) => Promise<string>;
  clearError: () => void;
}

// Component Types
export interface PaymentFormProps {
  onSubmit: (data: PaymentFormData) => Promise<void>;
  amount?: number;
  currency?: string;
  loading?: boolean;
  enableTokenization?: boolean;
  onTokenizationSuccess?: (token: string) => void;
  className?: string;
}

export interface PaymentFormData {
  amount: number;
  cardDetails: CardDetails;
  customer?: Customer;
}

export interface PaymentFormErrors {
  card_holder?: string;
  card_number?: string;
  card_expiry?: string;
  cvv?: string;
  amount?: string;
  general?: string;
}

// OAuth and Verification Types
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope?: string[];
}

export interface VerificationHashData {
  amount: number;
  currency: string;
  reference: string;
  card_token?: string;
  timestamp: number;
}

export interface WebhookEvent {
  id: string;
  type: string;
  created_at: string;
  data: {
    object: TransactionResponse | TokenizationResponse | SettlementResponse;
  };
  api_version: string;
}

// Constants
export const CURRENCIES = {
  AUD: 'AUD',
  USD: 'USD',
  NZD: 'NZD',
  GBP: 'GBP',
  EUR: 'EUR',
} as const;

export const TEST_CARDS = {
  VISA_SUCCESS: '4005550000000001',
  MASTERCARD_SUCCESS: '5123456789012346',
  AMEX_SUCCESS: '345678901234564',
  VISA_DECLINE: '4005550000000019',
  MASTERCARD_DECLINE: '5123456789012353',
  AMEX_DECLINE: '345678901234572',
} as const;

// Error Types
export class FatZebraError extends Error {
  errors: string[];
  response?: any;
  
  constructor(message: string, errors: string[] = [], response?: any) {
    super(message);
    this.name = 'FatZebraError';
    this.errors = errors;
    this.response = response;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FatZebraError);
    }
  }
}

// Type Guards
export function isFatZebraError(error: unknown): error is FatZebraError {
  return error instanceof FatZebraError;
}

export function isErrorWithMessage(error: unknown): error is { message: string } {
  return typeof error === 'object' && error !== null && 'message' in error;
}

export function isErrorWithErrors(error: unknown): error is { errors: string[] } {
  return typeof error === 'object' && error !== null && 'errors' in error && Array.isArray((error as any).errors);
}

// Utility Types
export type Currency = keyof typeof CURRENCIES;
export type TestCard = keyof typeof TEST_CARDS;
export type PaymentMethod = 'card' | 'token';
export type TransactionType = 'purchase' | 'authorization' | 'refund';