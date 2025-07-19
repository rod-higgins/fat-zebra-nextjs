/**
 * Type definitions for Fat Zebra Next.js Package
 */

// Configuration Types
export interface FatZebraConfig {
  username: string;
  token: string;
  sandbox?: boolean;
  gatewayUrl?: string;
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

export interface CardValidationResult {
  valid: boolean;
  errors: string[];
  type?: string;
}

// Request Types
export interface PurchaseRequest {
  amount: number;
  currency?: string;
  reference?: string;
  customer_ip?: string;
  card_holder: string;
  card_number: string;
  card_expiry: string;
  cvv: string;
  customer?: Customer;
  metadata?: Record<string, any>;
}

export interface AuthorizationRequest extends Omit<PurchaseRequest, 'amount'> {
  amount: number;
  capture?: boolean;
}

export interface RefundRequest {
  transaction_id: string;
  amount?: number;
  reference?: string;
  reason?: string;
}

export interface TokenizationRequest {
  card_holder: string;
  card_number: string;
  card_expiry: string;
  cvv?: string;
}

// Response Types
export interface FatZebraResponse<T = any> {
  successful: boolean;
  response?: T;
  errors?: string[];
  test?: boolean;
}

export interface TransactionResponse {
  id: string;
  amount: number;
  currency: string;
  reference: string;
  message: string;
  successful: boolean;
  settlement_date: string;
  transaction_id: string;
  card_holder: string;
  card_number: string;
  card_type: string;
  authorization: string;
  captured: boolean;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface TokenizationResponse {
  token: string;
  card_holder: string;
  card_number: string;
  card_type: string;
  expiry_date: string;
  created_at: string;
}

export interface SettlementResponse {
  id: string;
  settlement_date: string;
  transactions: TransactionResponse[];
  total_amount: number;
  currency: string;
}

// Hook Types
export interface UsePaymentOptions {
  onSuccess?: (response: TransactionResponse) => void;
  onError?: (error: FatZebraError) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface UsePaymentResult {
  processPayment: (data: PurchaseRequest) => Promise<TransactionResponse>;
  loading: boolean;
  error: string | null;
  reset: () => void;
}

// Component Types
export interface PaymentFormProps {
  amount: number;
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

// Error Message Extraction Utility
export function extractErrorMessage(error: unknown): string {
  if (isFatZebraError(error)) {
    return error.errors.length > 0 ? error.errors[0] : error.message;
  }
  
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unknown error occurred';
}

// Error Details Extraction Utility
export function extractErrorDetails(error: unknown): string[] {
  if (isFatZebraError(error)) {
    return error.errors.length > 0 ? error.errors : [error.message];
  }
  
  if (isErrorWithErrors(error)) {
    return error.errors;
  }
  
  if (isErrorWithMessage(error)) {
    return [error.message];
  }
  
  if (typeof error === 'string') {
    return [error];
  }
  
  return ['An unknown error occurred'];
}

// Utility Types
export type Currency = keyof typeof CURRENCIES;
export type TestCard = keyof typeof TEST_CARDS;
export type PaymentMethod = 'card' | 'token';
export type TransactionType = 'purchase' | 'authorization' | 'refund';