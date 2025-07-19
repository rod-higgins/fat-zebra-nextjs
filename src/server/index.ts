/**
 * Fat Zebra Next.js Package - Server Module Exports
 */

// Export server-side route handlers explicitly
export {
  handlePurchase,
  handleAuthorization,
  handleCapture,
  handleRefund,
  handleTokenization,
  handleVoid,
  handleTransactionStatus,
  handleVerifyWebhook,
  handleGenerateHash,
  handleHealthCheck,
  runtime,
  dynamic
} from './routes';

// Re-export client for server-side use
export { 
  createFatZebraClient, 
  FatZebraClient, 
  FatZebraError, 
  handleFatZebraResponse 
} from '../lib/client';

// Re-export specific types needed for server-side operations
export type {
  FatZebraConfig,
  PurchaseRequest,
  AuthorizationRequest,
  RefundRequest,
  TokenizationRequest,
  FatZebraResponse,
  TransactionResponse,
  TokenizationResponse,
  SettlementResponse,
  VerificationHashData,
  WebhookEvent,
  OAuthConfig,
  Customer,
  CardDetails
} from '../types';

// Re-export specific utilities needed for server-side operations
export {
  validateCard,
  validateAmount,
  formatCurrency,
  sanitizeCardNumber,
  generateReference,
  isTestCard,
  delay,
  retryWithBackoff
} from '../utils';

// Re-export error handling utilities (choose one source to avoid conflicts)
export {
  extractErrorMessage,
  extractErrorDetails
} from '../utils'; // Use utils version since it's more comprehensive

// Re-export hash generation utility (choose one source to avoid conflicts)
export {
  generateVerificationHash
} from '../utils'; // Use utils version since it's the canonical implementation