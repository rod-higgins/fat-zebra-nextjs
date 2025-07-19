import type { CardType } from '../types';

/**
 * Card validation utility functions
 */

// Luhn algorithm for card validation
export function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  let sum = 0;
  let isEven = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i]);
    
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

// Detect card type from number
export function detectCardType(cardNumber: string): CardType | null {
  const digits = cardNumber.replace(/\D/g, '');
  
  // Visa
  if (/^4/.test(digits)) {
    return 'visa';
  }
  
  // Mastercard
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) {
    return 'mastercard';
  }
  
  // American Express
  if (/^3[47]/.test(digits)) {
    return 'amex';
  }
  
  // Diners Club
  if (/^3[0689]/.test(digits)) {
    return 'diners';
  }
  
  // Discover
  if (/^6(?:011|5)/.test(digits)) {
    return 'discover';
  }
  
  // JCB
  if (/^35/.test(digits)) {
    return 'jcb';
  }
  
  return null;
}

// Get expected length for card type
export function getCardLength(cardType: CardType): number[] {
  switch (cardType) {
    case 'amex':
      return [15];
    case 'diners':
      return [14];
    case 'visa':
    case 'mastercard':
    case 'discover':
    case 'jcb':
    default:
      return [16];
  }
}

// Get expected CVV length for card type
export function getCvvLength(cardType: CardType): number {
  return cardType === 'amex' ? 4 : 3;
}

// Comprehensive card validation
export interface CardValidation {
  isValid: boolean;
  type: CardType | null;
  errors: string[];
}

export function validateCard(cardNumber: string): CardValidation {
  const digits = cardNumber.replace(/\D/g, '');
  const type = detectCardType(digits);
  const errors: string[] = [];
  
  if (!digits) {
    errors.push('Card number is required');
    return { isValid: false, type: null, errors };
  }
  
  if (!type) {
    errors.push('Invalid card type');
    return { isValid: false, type: null, errors };
  }
  
  const expectedLengths = getCardLength(type);
  if (!expectedLengths.includes(digits.length)) {
    errors.push(`Invalid card length for ${type}`);
  }
  
  if (!luhnCheck(digits)) {
    errors.push('Invalid card number');
  }
  
  return {
    isValid: errors.length === 0,
    type,
    errors
  };
}

// Validate CVV
export function validateCvv(cvv: string, cardType: CardType): boolean {
  const digits = cvv.replace(/\D/g, '');
  const expectedLength = getCvvLength(cardType);
  return digits.length === expectedLength;
}

// Validate expiry date
export function validateExpiry(month: string, year: string): boolean {
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  
  if (monthNum < 1 || monthNum > 12) {
    return false;
  }
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear() % 100;
  const currentMonth = currentDate.getMonth() + 1;
  
  if (yearNum < currentYear) {
    return false;
  }
  
  if (yearNum === currentYear && monthNum < currentMonth) {
    return false;
  }
  
  return true;
}

/**
 * Card formatting utility functions
 */

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  const type = detectCardType(digits);
  
  if (type === 'amex') {
    // American Express: XXXX XXXXXX XXXXX
    return digits.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
  } else if (type === 'diners') {
    // Diners Club: XXXX XXXXXX XXXX
    return digits.replace(/(\d{4})(\d{6})(\d{4})/, '$1 $2 $3');
  } else {
    // Others: XXXX XXXX XXXX XXXX
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  }
}

export function formatCardExpiry(value: string): string {
  const digits = value.replace(/\D/g, '');
  
  if (digits.length >= 2) {
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
  }
  
  return digits;
}

export function unformatCardNumber(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Amount formatting utilities
 */

export function formatAmount(amount: number, currency: string = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function parseAmount(value: string): number {
  const cleaned = value.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Reference generation utilities
 */

export function generateReference(prefix: string = 'ORDER'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateUniqueId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Environment utilities
 */

export function isTestMode(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Browser
    return window.location.origin;
  }
  
  // Server
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  if (process.env.NODE_ENV === 'production') {
    return 'https://yourdomain.com'; // Replace with your production domain
  }
  
  return 'http://localhost:3000';
}

/**
 * Error handling utilities
 */

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return 'An unknown error occurred';
}

export function extractErrorDetails(error: unknown): string[] {
  if (error && typeof error === 'object') {
    if ('errors' in error && Array.isArray(error.errors)) {
      return error.errors.map(String);
    }
    
    if ('details' in error && Array.isArray(error.details)) {
      return error.details.map(String);
    }
  }
  
  return [];
}

/**
 * Date utilities
 */

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function isExpired(expiryMonth: string, expiryYear: string): boolean {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  const expYear = parseInt(`20${expiryYear}`, 10);
  const expMonth = parseInt(expiryMonth, 10);
  
  if (expYear < currentYear) {
    return true;
  }
  
  if (expYear === currentYear && expMonth < currentMonth) {
    return true;
  }
  
  return false;
}

/**
 * Security utilities
 */

export function maskCardNumber(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  const lastFour = digits.slice(-4);
  const masked = '*'.repeat(Math.max(0, digits.length - 4));
  return `${masked}${lastFour}`;
}

export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;
  
  const maskedLocal = localPart.length > 2 
    ? `${localPart[0]}${'*'.repeat(localPart.length - 2)}${localPart.slice(-1)}`
    : localPart;
    
  return `${maskedLocal}@${domain}`;
}

/**
 * Validation utilities
 */

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{10}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function isValidPostcode(postcode: string, country: string = 'AU'): boolean {
  const postcodeRegex = {
    AU: /^\d{4}$/,
    US: /^\d{5}(-\d{4})?$/,
    UK: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
    CA: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i
  };
  
  const regex = postcodeRegex[country as keyof typeof postcodeRegex];
  return regex ? regex.test(postcode) : true;
}

/**
 * Debounce utility for form inputs
 */

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Currency utilities
 */

export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    AUD: '$',
    USD: '$',
    EUR: '€',
    GBP: '£',
    NZD: '$',
    CAD: '$',
    JPY: '¥'
  };
  
  return symbols[currency] || currency;
}

export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${getCurrencySymbol(currency)}${amount.toFixed(2)}`;
  }
}