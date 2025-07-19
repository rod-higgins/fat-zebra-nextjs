import { CardValidationResult } from '../types';

// Card validation patterns
const CARD_PATTERNS = {
  visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
  mastercard: /^5[1-5][0-9]{14}$/,
  amex: /^3[47][0-9]{13}$/,
  discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
  diners: /^3[0689][0-9]{11}$/,
  jcb: /^(?:2131|1800|35\d{3})\d{11}$/,
  unionpay: /^(62|88)\d{14,17}$/
};

// Card type detection based on number
export function getCardType(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  
  for (const [type, pattern] of Object.entries(CARD_PATTERNS)) {
    if (pattern.test(cleanNumber)) {
      return type.charAt(0).toUpperCase() + type.slice(1);
    }
  }
  
  return 'Unknown';
}

// Luhn algorithm for card number validation
export function isValidCardNumber(cardNumber: string): boolean {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  
  if (!/^\d+$/.test(cleanNumber)) {
    return false;
  }
  
  let sum = 0;
  let isEven = false;
  
  // Process digits from right to left
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i), 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

// Comprehensive card validation
export function validateCard(cardNumber: string): CardValidationResult {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  const errors: string[] = [];
  
  // Check if empty
  if (!cleanNumber) {
    errors.push('Card number is required');
    return { isValid: false, cardType: 'Unknown', errors };
  }
  
  // Check if all digits
  if (!/^\d+$/.test(cleanNumber)) {
    errors.push('Card number must contain only digits');
    return { isValid: false, cardType: 'Unknown', errors };
  }
  
  // Check length
  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    errors.push('Card number must be between 13 and 19 digits');
  }
  
  // Get card type
  const cardType = getCardType(cleanNumber);
  
  // Validate specific card type lengths
  if (cardType === 'Amex' && cleanNumber.length !== 15) {
    errors.push('American Express card numbers must be 15 digits');
  } else if (cardType === 'Visa' && ![13, 16, 19].includes(cleanNumber.length)) {
    errors.push('Visa card numbers must be 13, 16, or 19 digits');
  } else if (cardType === 'Mastercard' && cleanNumber.length !== 16) {
    errors.push('Mastercard numbers must be 16 digits');
  }
  
  // Luhn algorithm validation
  if (!isValidCardNumber(cleanNumber)) {
    errors.push('Invalid card number');
  }
  
  return {
    isValid: errors.length === 0,
    cardType,
    errors
  };
}

// Format card number with spaces
export function formatCardNumber(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  const cardType = getCardType(cleanNumber);
  
  // American Express format: 1234 567890 12345
  if (cardType === 'Amex') {
    return cleanNumber.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3').trim();
  }
  
  // Default format: 1234 5678 9012 3456
  return cleanNumber.replace(/(\d{4})/g, '$1 ').trim();
}

// Format expiry date
export function formatExpiryDate(expiry: string): string {
  const cleanExpiry = expiry.replace(/\D/g, '');
  
  if (cleanExpiry.length >= 2) {
    return cleanExpiry.replace(/(\d{2})(\d{0,2})/, '$1/$2');
  }
  
  return cleanExpiry;
}

// Validate expiry date
export function isValidExpiryDate(expiry: string): boolean {
  if (!/^\d{2}\/\d{2}$/.test(expiry)) {
    return false;
  }
  
  const [month, year] = expiry.split('/').map(Number);
  
  // Check month range
  if (month < 1 || month > 12) {
    return false;
  }
  
  // Check if not expired
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear() % 100;
  const currentMonth = currentDate.getMonth() + 1;
  
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return false;
  }
  
  return true;
}

// CVV validation
export function isValidCVV(cvv: string, cardType?: string): boolean {
  if (!/^\d+$/.test(cvv)) {
    return false;
  }
  
  // American Express uses 4 digits, others use 3
  if (cardType === 'Amex') {
    return cvv.length === 4;
  }
  
  return cvv.length === 3;
}

// Format currency amount
export function formatCurrency(amount: number, currency: string = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

// Generate random reference
export function generateReference(prefix: string = 'PAY'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Mask card number for display
export function maskCardNumber(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\s/g, '');
  if (cleanNumber.length < 4) {
    return '*'.repeat(cleanNumber.length);
  }
  
  const lastFour = cleanNumber.slice(-4);
  const masked = '*'.repeat(cleanNumber.length - 4);
  return formatCardNumber(masked + lastFour);
}

// Validate email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number (Australian format)
export function isValidPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\s/g, '');
  // Australian mobile: starts with 04, then 8 digits
  // Australian landline: area code (2-8 digits) + number (6-8 digits)
  const phoneRegex = /^(\+61|0)[2-9]\d{8}$|^04\d{8}$/;
  return phoneRegex.test(cleanPhone);
}

// Format phone number
export function formatPhone(phone: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Australian mobile format
  if (cleanPhone.startsWith('04') && cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  }
  
  // Australian landline format
  if (cleanPhone.length === 10 && /^[2-8]/.test(cleanPhone)) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2 $3');
  }
  
  return phone;
}

// Validate Australian postcode
export function isValidPostcode(postcode: string): boolean {
  return /^\d{4}$/.test(postcode);
}

// Currency conversion utilities
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRate: number
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }
  return Math.round(amount * exchangeRate * 100) / 100;
}

// Calculate transaction fee
export function calculateTransactionFee(
  amount: number,
  feePercentage: number = 2.9,
  fixedFee: number = 0.30
): number {
  return Math.round((amount * (feePercentage / 100) + fixedFee) * 100) / 100;
}

// Validate BSB (Australian Bank State Branch)
export function isValidBSB(bsb: string): boolean {
  const cleanBSB = bsb.replace(/\D/g, '');
  return /^\d{6}$/.test(cleanBSB);
}

// Format BSB
export function formatBSB(bsb: string): string {
  const cleanBSB = bsb.replace(/\D/g, '');
  if (cleanBSB.length >= 3) {
    return cleanBSB.replace(/(\d{3})(\d{0,3})/, '$1-$2');
  }
  return cleanBSB;
}

// Validate Australian account number
export function isValidAccountNumber(accountNumber: string): boolean {
  const cleanNumber = accountNumber.replace(/\D/g, '');
  return cleanNumber.length >= 4 && cleanNumber.length <= 10;
}

// Data sanitization utilities
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function sanitizeCardData(cardData: any): any {
  return {
    ...cardData,
    card_holder: sanitizeInput(cardData.card_holder || ''),
    card_number: (cardData.card_number || '').replace(/\D/g, ''),
    card_expiry: (cardData.card_expiry || '').replace(/\D/g, '').substring(0, 4),
    cvv: (cardData.cvv || '').replace(/\D/g, '').substring(0, 4)
  };
}

// Error handling utilities
export function formatErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (Array.isArray(error) && error.length > 0) {
    return error[0];
  }
  
  return 'An unexpected error occurred';
}

// Retry mechanism for API calls
export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (i === maxRetries - 1) {
        throw lastError;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  
  throw lastError!;
}

// Environment detection utilities
export function isTestMode(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export function getApiBaseUrl(): string {
  return isTestMode() 
    ? 'https://gateway.pmnts-sandbox.io'
    : 'https://gateway.pmnts.io';
}

// Test card numbers for development
export const TEST_CARDS = {
  VISA_SUCCESS: '4005550000000001',
  VISA_3DS_SUCCESS: '4005554444444460',
  VISA_DECLINE: '4005550000000019',
  MASTERCARD_SUCCESS: '5123456789012346',
  MASTERCARD_3DS_SUCCESS: '5123456789012353',
  MASTERCARD_DECLINE: '5123456789012353',
  AMEX_SUCCESS: '345678901234564',
  AMEX_DECLINE: '345678901234572'
} as const;

// Export all utilities
export default {
  getCardType,
  isValidCardNumber,
  validateCard,
  formatCardNumber,
  formatExpiryDate,
  isValidExpiryDate,
  isValidCVV,
  formatCurrency,
  generateReference,
  maskCardNumber,
  isValidEmail,
  isValidPhone,
  formatPhone,
  isValidPostcode,
  convertCurrency,
  calculateTransactionFee,
  isValidBSB,
  formatBSB,
  isValidAccountNumber,
  sanitizeInput,
  sanitizeCardData,
  formatErrorMessage,
  retryAsync,
  isTestMode,
  getApiBaseUrl,
  TEST_CARDS
};