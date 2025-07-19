// Export all validation utilities
export * from './validation';

// Re-export commonly used functions with shorter names
export {
  validateCard as isValidCard,
  formatCardNumber as formatCard,
  maskCardNumber as maskCard,
  generateReference as createReference,
  formatCurrency as toCurrency,
  parseCurrencyAmount as parseAmount,
  isTestCardNumber as isTestCard
} from './validation';