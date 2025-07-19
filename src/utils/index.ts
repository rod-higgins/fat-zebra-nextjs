/**
 * Fat Zebra Next.js Package - Utility Functions
 * Complete utility functions for validation, formatting, and error handling
 */

import type { CardValidationResult, VerificationHashData } from '../types';
import { FatZebraError, isErrorWithMessage, isErrorWithErrors } from '../types';

/**
 * Luhn algorithm for credit card validation
 */
export function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  
  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);

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

/**
 * Get card type from card number
 */
export function getCardType(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  
  if (digits.match(/^4/)) return 'visa';
  if (digits.match(/^5[1-5]/)) return 'mastercard';
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

  return {
    valid: errors.length === 0,
    errors,
    type: cardNumber ? getCardType(cardNumber) : undefined,
  };
}

/**
 * Format card number with spaces
 */
export function formatCardNumber(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  const cardType = getCardType(digits);
  
  if (cardType === 'amex') {
    // Format: XXXX XXXXXX XXXXX
    return digits.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
  } else {
    // Format: XXXX XXXX XXXX XXXX
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  }
}

/**
 * Format expiry date
 */
export function formatExpiryDate(expiry: string): string {
  const digits = expiry.replace(/\D/g, '');
  
  if (digits.length >= 2) {
    return digits.substring(0, 2) + (digits.length > 2 ? '/' + digits.substring(2, 4) : '');
  }
  
  return digits;
}

/**
 * Format CVV
 */
export function formatCvv(cvv: string): string {
  return cvv.replace(/\D/g, '').substring(0, 4);
}

/**
 * Validate amount
 */
export function validateAmount(amount: number): void {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new FatZebraError('Amount must be a valid number');
  }
  
  if (amount <= 0) {
    throw new FatZebraError('Amount must be greater than 0');
  }
  
  if (amount > 999999.99) {
    throw new FatZebraError('Amount cannot exceed $999,999.99');
  }
  
  // Check for valid decimal places (max 2)
  if (Math.round(amount * 100) !== amount * 100) {
    throw new FatZebraError('Amount can have at most 2 decimal places');
  }
}

/**
 * Generate verification hash for webhooks
 */
export async function generateVerificationHash(data: VerificationHashData, secret: string): Promise<string> {
  try {
    const crypto = await import('crypto');
    const payload = `${data.amount}${data.currency}${data.reference}${data.card_token || ''}${data.timestamp}`;
    const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return hash;
  } catch (error) {
    throw new FatZebraError(
      'Failed to generate verification hash',
      [error instanceof Error ? error.message : 'Unknown error']
    );
  }
}

/**
 * Extract error message from various error types
 */
export function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof FatZebraError) {
    return error.message;
  }
  
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  
  if (isErrorWithErrors(error) && error.errors.length > 0) {
    return error.errors[0];
  }
  
  return 'An unknown error occurred';
}

/**
 * Extract error details from various error types
 */
export function extractErrorDetails(error: unknown): string[] {
  if (error instanceof FatZebraError) {
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