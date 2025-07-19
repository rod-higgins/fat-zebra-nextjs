// Core client functionality
export { 
  FatZebraClient,
  createFatZebraClient,
  FatZebraError,
  handleFatZebraResponse,
  TEST_CARDS
} from './lib';

// React components
export { PaymentForm } from './components';

// React hooks
export { 
  usePayment,
  useOAuthPayment,
  usePaymentEvents
} from './hooks';

// Utility functions
export {
  validateCard,
  formatCardNumber,
  formatExpiryDate,
  formatCvv,
  detectCardType,
  luhnCheck,
  validateEmail,
  validatePhone,
  maskCardNumber,
  generateReference,
  formatCurrency,
  parseCurrencyAmount,
  validateAmount,
  isTestCardNumber,
  generateTestCustomer,
  // Utility aliases
  isValidCard,
  formatCard,
  maskCard,
  createReference,
  toCurrency,
  parseAmount,
  isTestCard
} from './utils';

// Server-side handlers
export {
  generateAccessToken,
  processPayment,
  processPaymentWithToken,
  tokenizeCard,
  generateVerificationHash,
  handleWebhook,
  verifyCard,
  getTransaction,
  healthCheck
} from './server';

// Type definitions - all from types module
export type {
  FatZebraConfig,
  OAuthConfig,
  CardDetails,
  Customer,
  PurchaseRequest,
  AuthorizationRequest,
  RefundRequest,
  TokenizationRequest,
  TransactionResponse,
  TokenizationResponse,
  FatZebraResponse,
  PaymentFormData,
  PaymentFormProps,
  UsePaymentOptions,
  UsePaymentResult,
  DirectDebitRequest,
  WebhookEvent,
  VerificationHashData,
  Environment,
  PaymentEvent,
  SettlementResponse,
  BatchRequest,
  CardValidationResult,
  PaymentFormErrors
} from './types';

// Default export
export { createFatZebraClient as default } from './lib';