/**
 * Fat Zebra Next.js Package - Main Module Exports
 * Entry point for the Fat Zebra Next.js payment library
 */

// Core client exports
export { 
  FatZebraClient, 
  createFatZebraClient, 
  FatZebraError, 
  handleFatZebraResponse 
} from './lib/client';

// React components
export { PaymentForm } from './components';

// React hooks
export { usePayment, usePaymentWithRetry } from './hooks';

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

// Constants
export { TEST_CARDS, CURRENCIES } from './types';

// Default export for convenience
export default {
  createFatZebraClient,
  FatZebraError,
  handleFatZebraResponse,
  PaymentForm,
  usePayment,
  TEST_CARDS,
  CURRENCIES,
};