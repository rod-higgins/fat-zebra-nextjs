import { createHmac } from 'crypto';
import type { 
  CardValidationResult, 
  CardType, 
  Currency,
  VerificationHashData,
  FatZebraResponse 
} from '../types';
import { CARD_TYPES, TEST_CARDS, ERROR_CODES } from '../types';

/**
 * Card validation utilities
 */

export function validateCard(cardNumber: string): CardValidationResult {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  const errors: string[] = [];
  
  // Check length
  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    errors.push('Card number must be between 13 and 19 digits');
  }
  
  // Luhn algorithm check
  if (!isValidLuhn(cleanNumber)) {
    errors.push('Invalid card number');
  }
  
  const cardType = detectCardType(cleanNumber);
  
  // Check specific card type requirements
  if (cardType === CARD_TYPES.AMEX && cleanNumber.length !== 15) {
    errors.push('American Express cards must be 15 digits');
  } else if (cardType === CARD_TYPES.DINERS && ![14, 16].includes(cleanNumber.length)) {
    errors.push('Diners Club cards must be 14 or 16 digits');
  } else if ([CARD_TYPES.VISA, CARD_TYPES.MASTERCARD].includes(cardType) && cleanNumber.length !== 16) {
    errors.push('Visa and MasterCard must be 16 digits');
  }
  
  return {
    isValid: errors.length === 0,
    cardType,
    errors
  };
}

export function isValidLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
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

export function detectCardType(cardNumber: string): CardType {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  
  // Visa: starts with 4
  if (/^4/.test(cleanNumber)) {
    return CARD_TYPES.VISA;
  }
  
  // MasterCard: starts with 5[1-5] or 2[2-7]
  if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) {
    return CARD_TYPES.MASTERCARD;
  }
  
  // American Express: starts with 34 or 37
  if (/^3[47]/.test(cleanNumber)) {
    return CARD_TYPES.AMEX;
  }
  
  // Diners Club: starts with 30, 36, 38, or 39
  if (/^3[0689]/.test(cleanNumber)) {
    return CARD_TYPES.DINERS;
  }
  
  // Discover: starts with 6011, 622126-622925, 644-649, or 65
  if (/^(6011|65|64[4-9]|622(12[6-9]|1[3-9][0-9]|[2-8][0-9]{2}|9[01][0-9]|92[0-5]))/.test(cleanNumber)) {
    return CARD_TYPES.DISCOVER;
  }
  
  // JCB: starts with 35
  if (/^35/.test(cleanNumber)) {
    return CARD_TYPES.JCB;
  }
  
  return CARD_TYPES.UNKNOWN;
}

/**
 * Card formatting utilities
 */

export function formatCardNumber(cardNumber: string): string {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  const cardType = detectCardType(cleanNumber);
  
  // Different formatting for different card types
  switch (cardType) {
    case CARD_TYPES.AMEX:
      // Format: 4-6-5
      return cleanNumber
        .slice(0, 15)
        .replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3')
        .trim();
    
    case CARD_TYPES.DINERS:
      // Format: 4-6-4
      return cleanNumber
        .slice(0, 14)
        .replace(/(\d{4})(\d{6})(\d{4})/, '$1 $2 $3')
        .trim();
    
    default:
      // Format: 4-4-4-4
      return cleanNumber
        .slice(0, 16)
        .replace(/(\d{4})(?=\d)/g, '$1 ')
        .trim();
  }
}

export function formatCardExpiry(expiry: string): string {
  const cleaned = expiry.replace(/\D/g, '');
  
  if (cleaned.length === 0) {
    return '';
  } else if (cleaned.length <= 2) {
    return cleaned;
  } else {
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
  }
}

export function parseCardExpiry(expiry: string): { month: string; year: string } {
  const parts = expiry.split('/');
  return {
    month: parts[0] || '',
    year: parts[1] || ''
  };
}

/**
 * Currency and amount utilities
 */

export function formatCurrency(amount: number, currency: Currency = 'AUD'): string {
  const formatter = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return formatter.format(amount);
}

export function parseCurrency(currencyString: string): number {
  const cleaned = currencyString.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}

export function convertCents(amount: number): number {
  return Math.round(amount * 100);
}

export function convertFromCents(amountInCents: number): number {
  return amountInCents / 100;
}

/**
 * Reference generation utilities
 */

export function generateReference(prefix: string = 'ORDER'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateUniqueId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function generateTransactionId(): string {
  return `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
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

export function getFatZebraBaseUrl(isTestMode: boolean = true): string {
  return isTestMode 
    ? 'https://gateway.pmnts-sandbox.io'
    : 'https://gateway.fatzebra.com';
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

export function mapFatZebraError(errorCode: string): string {
  const errorMap: Record<string, string> = {
    '01': 'Refer to card issuer',
    '02': 'Refer to card issuer, special condition',
    '03': 'Invalid merchant',
    '04': 'Pick up card',
    '05': 'Do not honor',
    '06': 'Error',
    '07': 'Pick up card, special condition',
    '08': 'Honor with identification',
    '09': 'Request in progress',
    '10': 'Approved for partial amount',
    '11': 'Approved (VIP)',
    '12': 'Invalid transaction',
    '13': 'Invalid amount',
    '14': 'Invalid card number',
    '15': 'No such issuer',
    '19': 'Re-enter transaction',
    '21': 'No action taken',
    '25': 'Unable to locate record on file',
    '28': 'File is temporarily unavailable',
    '30': 'Format error',
    '41': 'Lost card',
    '43': 'Stolen card',
    '51': 'Insufficient funds',
    '54': 'Expired card',
    '55': 'Incorrect PIN',
    '57': 'Transaction not permitted to cardholder',
    '58': 'Transaction not permitted to terminal',
    '61': 'Exceeds withdrawal amount limit',
    '62': 'Restricted card',
    '65': 'Exceeds withdrawal frequency limit',
    '91': 'Issuer or switch is inoperative',
    '92': 'Financial institution or intermediate network facility cannot be found for routing',
    '94': 'Duplicate transmission',
    '96': 'System malfunction'
  };
  
  return errorMap[errorCode] || 'Transaction declined';
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
  const currentYear = now.getFullYear() % 100; // Get last 2 digits
  const currentMonth = now.getMonth() + 1;
  
  const expYear = parseInt(expiryYear, 10);
  const expMonth = parseInt(expiryMonth, 10);
  
  if (expYear < currentYear) {
    return true;
  }
  
  if (expYear === currentYear && expMonth < currentMonth) {
    return true;
  }
  
  return false;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatISO8601(date: Date): string {
  return date.toISOString();
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

export function generateVerificationHash(data: VerificationHashData, sharedSecret: string): string {
  const payload = `${data.reference}|${data.amount}|${data.currency}|${data.timestamp || Date.now()}`;
  return createHmac('sha256', sharedSecret)
    .update(payload)
    .digest('hex');
}

export function verifyWebhookSignature(payload: string, signature: string, sharedSecret: string): boolean {
  const expectedSignature = createHmac('sha256', sharedSecret)
    .update(payload)
    .digest('hex');
  
  return expectedSignature === signature;
}

/**
 * Validation utilities
 */

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return phoneRegex.test(cleaned);
}

export function isValidPostcode(postcode: string, country: string = 'AU'): boolean {
  const patterns: Record<string, RegExp> = {
    AU: /^[0-9]{4}$/,
    US: /^[0-9]{5}(-[0-9]{4})?$/,
    UK: /^[A-Z]{1,2}[0-9R][0-9A-Z]? [0-9][A-Z]{2}$/i,
    CA: /^[A-Z][0-9][A-Z] [0-9][A-Z][0-9]$/i
  };
  
  const pattern = patterns[country];
  return pattern ? pattern.test(postcode) : true;
}

export function validateAmount(amount: number, currency: Currency = 'AUD'): boolean {
  if (amount <= 0) return false;
  
  // Minimum amounts by currency
  const minimums: Record<Currency, number> = {
    AUD: 0.50,
    USD: 0.50,
    NZD: 0.50,
    GBP: 0.30,
    EUR: 0.50,
    CAD: 0.50,
    SGD: 0.50,
    HKD: 4.00,
    JPY: 50
  };
  
  return amount >= (minimums[currency] || 0.50);
}

/**
 * Response handling utilities
 */

export function handleFatZebraResponse<T>(response: FatZebraResponse<T>): T {
  if (!response.successful) {
    throw new Error(
      response.errors?.join(', ') || 'Transaction failed'
    );
  }
  return response.response;
}

export function isTestCard(cardNumber: string): boolean {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  return Object.values(TEST_CARDS).includes(cleanNumber);
}

/**
 * URL and query utilities
 */

export function buildQueryString(params: Record<string, any>): string {
  const query = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      query.append(key, String(value));
    }
  });
  
  return query.toString();
}

export function parseQueryString(queryString: string): Record<string, string> {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
}

/**
 * Debounce utility for input validation
 */

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Local storage utilities (with fallback for server-side)
 */

export function getLocalStorageItem(key: string, defaultValue: any = null): any {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setLocalStorageItem(key: string, value: any): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently fail
  }
}

export function removeLocalStorageItem(key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(key);
  } catch {
    // Silently fail
  }
}

/**
 * Retry utility for API calls
 */

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (i === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}