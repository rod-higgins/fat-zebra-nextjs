/**
 * Fat Zebra Next.js Package - Utility Functions
 */

import type {
  CardDetails,
  CardValidationResult,
  VerificationHashData,
} from '../types';

// Import helper functions but not FatZebraError class since it's not used in this file
import { 
  isFatZebraError, 
  isErrorWithMessage, 
  isErrorWithErrors 
} from '../types';

// Type guards - these are already defined in types, but we can use them here

/**
 * Validate credit card number using Luhn algorithm
 */
export function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  let sum = 0;
  let alternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits.charAt(i), 10);

    if (alternate) {
      n *= 2;
      if (n > 9) {
        n = (n % 10) + 1;
      }
    }

    sum += n;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

/**
 * Get card type from card number
 */
export function getCardType(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  
  if (/^4/.test(digits)) return 'visa';
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^6(?:011|5)/.test(digits)) return 'discover';
  
  return 'unknown';
}

/**
 * Validate card details
 */
export function validateCard(cardDetails: CardDetails): CardValidationResult {
  const errors: string[] = [];
  
  // Validate card number
  if (!cardDetails.card_number || !luhnCheck(cardDetails.card_number)) {
    errors.push('Invalid card number');
  }
  
  // Validate card expiry (MM/YY format)
  if (!cardDetails.card_expiry || !/^\d{2}\/\d{2}$/.test(cardDetails.card_expiry)) {
    errors.push('Invalid expiry date format (MM/YY required)');
  } else {
    const [month, year] = cardDetails.card_expiry.split('/');
    const now = new Date();
    const expiryDate = new Date(
      2000 + parseInt(year), // Convert YY to full year
      parseInt(month) - 1
    );
    
    if (expiryDate < now) {
      errors.push('Card has expired');
    }
  }
  
  // Validate CVV
  if (!cardDetails.cvv || !/^\d{3,4}$/.test(cardDetails.cvv)) {
    errors.push('Invalid CVV');
  }
  
  // Validate card holder
  if (!cardDetails.card_holder || cardDetails.card_holder.trim().length < 2) {
    errors.push('Card holder name is required');
  }
  
  const result: CardValidationResult = {
    valid: errors.length === 0,
    errors,
  };

  // Only include type property if we have a card number
  if (cardDetails.card_number) {
    result.type = getCardType(cardDetails.card_number);
  }

  return result;
}

/**
 * Format card number for display
 */
export function formatCardNumber(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  const groups = digits.match(/.{1,4}/g) || [];
  return groups.join(' ').substring(0, 19); // Max length for most cards
}

/**
 * Format expiry date
 */
export function formatExpiryDate(expiry: string): string {
  const digits = expiry.replace(/\D/g, '');
  if (digits.length >= 2) {
    return digits.substring(0, 2) + '/' + digits.substring(2, 4);
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
 * Validate amount (removed unused currency parameter)
 */
export function validateAmount(amount: number): boolean {
  return typeof amount === 'number' && amount > 0 && Number.isFinite(amount);
}

/**
 * Generate verification hash
 */
export function generateVerificationHash(
  data: VerificationHashData,
  secret: string
): string {
  const crypto = require('crypto');
  const hashString = `${data.amount}${data.currency}${data.reference}${data.timestamp}${secret}`;
  return crypto.createHash('sha256').update(hashString).digest('hex');
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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const valid = emailRegex.test(email);
  
  if (valid) {
    return { valid: true };
  } else {
    return { valid: false, error: 'Invalid email format' };
  }
}

/**
 * Get client IP address from request headers
 */
export function getClientIP(request: any): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfIP) {
    return cfIP;
  }
  
  return '127.0.0.1'; // Fallback
}