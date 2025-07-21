/**
 * Fat Zebra Next.js Package - Main Module Exports
 * Entry point for the Fat Zebra Next.js payment library
 */

// Import for local use and re-export
import { FatZebraClient, createFatZebraClient, handleFatZebraResponse } from './lib/client';

import { FatZebraError, TEST_CARDS, CURRENCIES } from './types';
import { PaymentForm } from './components/PaymentForm';
import { usePayment, usePaymentWithRetry, useOAuthPayment } from './hooks';

// Re-export core client functions
export { FatZebraClient, createFatZebraClient, handleFatZebraResponse };

// Re-export error classes
export { FatZebraError };

// Re-export React components
export { PaymentForm };

// Re-export React hooks
export { usePayment, usePaymentWithRetry, useOAuthPayment };

// Utility functions
export {
  validateCard,
  formatCardNumber,
  formatExpiryDate,
  formatCvv,
  validateAmount,
  generateVerificationHash,
  extractErrorMessage,
  extractErrorDetails,
  formatCurrency,
  sanitizeCardNumber,
  generateReference,
  isTestCard,
  luhnCheck,
  getCardType,
} from './utils';

// Type definitions
export type {
  FatZebraConfig,
  CardDetails,
  Customer,
  PurchaseRequest,
  AuthorizationRequest,
  RefundRequest,
  TokenizationRequest,
  FatZebraResponse,
  TransactionResponse,
  TokenizationResponse,
  SettlementResponse,
  CardValidationResult,
  UsePaymentOptions,
  UsePaymentResult,
  PaymentFormProps,
  PaymentFormData,
  PaymentFormErrors,
  OAuthConfig,
  VerificationHashData,
  WebhookEvent,
  Currency,
  TestCard,
  PaymentMethod,
  TransactionType,
} from './types';

// Re-export OAuth hook types
export type {
  UseOAuthPaymentOptions,
  UseOAuthPaymentResult,
  OAuthPaymentData,
  ThreeDSResult,
} from './hooks';

// Re-export constants
export { TEST_CARDS, CURRENCIES };

// Default export for convenience - now using imported values
const FatZebraNextJS = {
  createFatZebraClient,
  FatZebraError,
  handleFatZebraResponse,
  PaymentForm,
  usePayment,
  useOAuthPayment,
  TEST_CARDS,
  CURRENCIES,
};

export default FatZebraNextJS;
