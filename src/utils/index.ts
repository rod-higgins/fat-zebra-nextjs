/**
 * Utility functions for Fat Zebra Next.js Package
 */

import type { CardValidationResult } from '../types';
import { 
  FatZebraError, 
  isFatZebraError, 
  isErrorWithMessage, 
  isErrorWithErrors 
} from '../types';

/**
 * Luhn algorithm check for credit card validation
 */
export function luhnCheck(num: string): boolean {
  let arr = (num + '')
    .split('')
    .reverse()
    .map(x => parseInt(x));
  let lastDigit = arr.splice(0, 1)[0];
  let sum = arr.reduce((acc, val, i) => (i % 2 !== 0 ? acc + val : acc + ((val * 2) % 9) || 9), 0);
  sum += lastDigit;
  return sum % 10 === 0;
}

/**
 * Get card type from card number
 */
export function getCardType(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  
  if (digits.match(/^4/)) return 'visa';
  if (digits.match(/^5[1-5]/)) return 'mastercard';
  if (digits.match(/^2[2-7]/)) return 'mastercard';
  if (digits.match(/^3[47]/)) return 'amex';
  if (digits.match(/^6(?:011|5)/)) return 'discover';
  if (digits.match(/^(?:2131|1800|35)/)) return 'jcb';
  if (digits.match(/^3[0689]/)) return 'diners';
  
  return 'unknown';
}

/**
 * Validate credit card details
 */
export function validateCard(cardDetails: {
  card_number: string;
  card_expiry: string;
  cvv: string;
  card_holder: string;
}): CardValidationResult {
  const errors: string[] = [];
  
  // Validate card holder
  if (!cardDetails.card_holder || cardDetails.card_holder.trim().length === 0) {
    errors.push('Card holder name is required');
  } else if (cardDetails.card_holder.trim().length < 2) {
    errors.push('Card holder name must be at least 2 characters');
  }

  // Validate card number
  const cardNumber = cardDetails.card_number.replace(/\D/g, '');
  if (!cardNumber) {
    errors.push('Card number is required');
  } else if (cardNumber.length < 13 || cardNumber.length > 19) {
    errors.push('Card number must be 13-19 digits');
  } else if (!luhnCheck(cardNumber)) {
    errors.push('Invalid card number');
  }

  // Validate expiry
  if (!cardDetails.card_expiry) {
    errors.push('Card expiry is required');
  } else {
    const expiryMatch = cardDetails.card_expiry.match(/^(\d{2})\/(\d{2,4})$/);
    if (!expiryMatch) {
      errors.push('Card expiry must be in MM/YY or MM/YYYY format');
    } else {
      const month = parseInt(expiryMatch[1], 10);
      let year = parseInt(expiryMatch[2], 10);
      
      if (expiryMatch[2].length === 2) {
        year += 2000; // Convert YY to YYYY
      }
      
      if (month < 1 || month > 12) {
        errors.push('Invalid expiry month');
      }
      
      const now = new Date();
      const expiryDate = new Date(year, month - 1); // month is 0-indexed
      
      if (expiryDate < now) {
        errors.push('Card has expired');
      }
    }
  }

  // Validate CVV
  if (!cardDetails.cvv) {
    errors.push('CVV is required');
  } else {
    const cvv = cardDetails.cvv.replace(/\D/g, '');
    const cardType = getCardType(cardNumber);
    
    if (cardType === 'amex' && cvv.length !== 4) {
      errors.push('American Express CVV must be 4 digits');
    } else if (cardType !== 'amex' && cvv.length !== 3) {
      errors.push('CVV must be 3 digits');
    }
  }

  const cardType = cardNumber ? getCardType(cardNumber) : undefined;

  return {
    valid: errors.length === 0,
    errors,
    type: cardType || 'unknown'
  };
}

/**
 * Format card number with appropriate spacing
 */
export function formatCardNumber(value: string): string {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const matches = v.match(/\d{4,16}/g);
  const match = matches && matches[0] || '';
  const parts = [];

  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }

  if (parts.length) {
    return parts.join(' ');
  } else {
    return v;
  }
}

/**
 * Format expiry date as MM/YY
 */
export function formatExpiryDate(value: string): string {
  const v = value.replace(/\D/g, '');
  if (v.length >= 2) {
    return v.substring(0, 2) + (v.length > 2 ? '/' + v.substring(2, 4) : '');
  }
  return v;
}

/**
 * Format CVV (limit to 4 digits)
 */
export function formatCvv(value: string): string {
  return value.replace(/\D/g, '').substring(0, 4);
}

/**
 * Validate amount
 */
export function validateAmount(amount: number, currency?: string): boolean {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return false;
  }
  
  if (amount <= 0) {
    return false;
  }
  
  // Check for reasonable maximum (adjust as needed)
  if (amount > 999999.99) {
    return false;
  }
  
  return true;
}

/**
 * Generate verification hash for secure transactions
 */
export function generateVerificationHash(data: {
  amount: number;
  currency: string;
  reference: string;
  timestamp: number;
}, secret: string): string {
  // Simple hash implementation - in production, use proper crypto
  const payload = `${data.amount}${data.currency}${data.reference}${data.timestamp}${secret}`;
  
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16);
}

/**
 * Extract error message from various error types
 */
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

/**
 * Extract error details from various error types
 */
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

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback for unsupported currencies
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Sanitize card number for logging (shows only last 4 digits)
 */
export function sanitizeCardNumber(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 4) {
    return '****';
  }
  return '**** **** **** ' + digits.slice(-4);
}

/**
 * Generate a unique reference ID
 */
export function generateReference(prefix = 'TXN'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

/**
 * Check if running in test mode based on card number
 */
export function isTestCard(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  const testCards = [
    '4005550000000001', // Visa Success
    '5123456789012346', // Mastercard Success
    '345678901234564',  // Amex Success
    '4005550000000019', // Visa Decline
    '5123456789012353', // Mastercard Decline
    '345678901234572',  // Amex Decline
  ];
  
  return testCards.includes(digits);
}

/**
 * Delay function for testing and retry logic
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      const delayMs = baseDelay * Math.pow(2, attempt);
      await delay(delayMs);
    }
  }
  
  throw lastError;
}

/**
 * Validate email address
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email.trim()) {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

/**
 * Validate phone number (basic validation)
 */
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  if (!phone.trim()) {
    return { valid: true }; // Phone is typically optional
  }

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  if (digits.length < 10) {
    return { valid: false, error: 'Phone number must be at least 10 digits' };
  }

  return { valid: true };
}

/**
 * Validate expiry date
 */
export function validateExpiryDate(expiryDate: string): { valid: boolean; error?: string } {
  const match = expiryDate.match(/^(\d{2})\/(\d{2})$/);
  
  if (!match) {
    return { valid: false, error: 'Expiry date must be in MM/YY format' };
  }

  const month = parseInt(match[1], 10);
  const year = 2000 + parseInt(match[2], 10);

  if (month < 1 || month > 12) {
    return { valid: false, error: 'Invalid month' };
  }

  const now = new Date();
  const expiry = new Date(year, month - 1);

  if (expiry < now) {
    return { valid: false, error: 'Card has expired' };
  }

  return { valid: true };
}

/**
 * Validate CVV
 */
export function validateCvv(cvv: string, cardType?: string): { valid: boolean; error?: string } {
  const digits = cvv.replace(/\D/g, '');

  if (!digits) {
    return { valid: false, error: 'CVV is required' };
  }

  // American Express uses 4-digit CVV, others use 3
  const expectedLength = cardType === 'American Express' ? 4 : 3;

  if (digits.length !== expectedLength) {
    return { 
      valid: false, 
      error: `CVV must be ${expectedLength} digits for ${cardType || 'this card type'}` 
    };
  }

  return { valid: true };
}