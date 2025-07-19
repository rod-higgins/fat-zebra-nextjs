import type { CardValidationResult } from '../types';

/**
 * Card number validation and formatting utilities
 */

// Luhn algorithm for card number validation
export function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  let sum = 0;
  let alternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);

    if (alternate) {
      digit *= 2;
      if (digit > 9) {
        digit = (digit % 10) + 1;
      }
    }

    sum += digit;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

// Detect card type from number
export function detectCardType(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');

  // Visa
  if (/^4/.test(digits)) {
    return 'Visa';
  }

  // Mastercard
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) {
    return 'Mastercard';
  }

  // American Express
  if (/^3[47]/.test(digits)) {
    return 'American Express';
  }

  // Discover
  if (/^6(?:011|5)/.test(digits)) {
    return 'Discover';
  }

  // Diners Club
  if (/^3[0689]/.test(digits)) {
    return 'Diners Club';
  }

  // JCB
  if (/^35/.test(digits)) {
    return 'JCB';
  }

  return 'Unknown';
}

// Validate card number
export function validateCard(cardNumber: string): CardValidationResult {
  const errors: string[] = [];
  const digits = cardNumber.replace(/\D/g, '');

  if (!digits) {
    return {
      valid: false,
      type: 'Unknown',
      errors: ['Card number is required'],
    };
  }

  if (digits.length < 13 || digits.length > 19) {
    errors.push('Card number must be between 13 and 19 digits');
  }

  if (!luhnCheck(digits)) {
    errors.push('Invalid card number');
  }

  const cardType = detectCardType(digits);

  // Additional validations based on card type
  switch (cardType) {
    case 'Visa':
      if (digits.length !== 13 && digits.length !== 16) {
        errors.push('Visa cards must be 13 or 16 digits');
      }
      break;
    case 'Mastercard':
      if (digits.length !== 16) {
        errors.push('Mastercard must be 16 digits');
      }
      break;
    case 'American Express':
      if (digits.length !== 15) {
        errors.push('American Express cards must be 15 digits');
      }
      break;
    case 'Discover':
      if (digits.length !== 16) {
        errors.push('Discover cards must be 16 digits');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    type: cardType,
    errors,
  };
}

// Format card number for display (with spaces)
export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  const cardType = detectCardType(digits);

  // American Express: 4-6-5 format
  if (cardType === 'American Express') {
    return digits.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3').trim();
  }

  // All others: 4-4-4-4 format
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

// Format expiry date (MM/YY)
export function formatExpiryDate(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (digits.length >= 2) {
    const month = digits.substring(0, 2);
    const year = digits.substring(2, 4);

    // Validate month
    if (parseInt(month) > 12) {
      return '12/' + year;
    }

    return month + (year ? '/' + year : '');
  }

  return digits;
}

// Format CVV (remove non-digits and limit length)
export function formatCvv(value: string): string {
  return value.replace(/\D/g, '').substring(0, 4);
}

// Validate expiry date
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

// Validate CVV
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
      error: `CVV must be ${expectedLength} digits for ${cardType || 'this card type'}`,
    };
  }

  return { valid: true };
}

// Validate email address
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

// Validate phone number (basic validation)
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

// Sanitize card number for logging (show only last 4 digits)
export function maskCardNumber(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 4) return '****';

  const masked = '*'.repeat(digits.length - 4) + digits.slice(-4);
  return formatCardNumber(masked);
}

// Generate a secure reference ID
export function generateReference(prefix: string = 'ORDER'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// Validate Australian postcode
export function validateAustralianPostcode(postcode: string): { valid: boolean; error?: string } {
  if (!postcode.trim()) {
    return { valid: true }; // Postcode might be optional
  }

  const postcodeRegex = /^\d{4}$/;
  if (!postcodeRegex.test(postcode)) {
    return { valid: false, error: 'Australian postcode must be 4 digits' };
  }

  return { valid: true };
}

// Format currency amount
export function formatCurrency(amount: number, currency: string = 'AUD'): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Parse currency amount from string
export function parseCurrencyAmount(value: string): number {
  const numericValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
  return isNaN(numericValue) ? 0 : Math.round(numericValue * 100) / 100;
}

// Validate amount
export function validateAmount(amount: number | string): { valid: boolean; error?: string } {
  const numAmount = typeof amount === 'string' ? parseCurrencyAmount(amount) : amount;

  if (isNaN(numAmount) || numAmount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  if (numAmount > 999999.99) {
    return { valid: false, error: 'Amount cannot exceed $999,999.99' };
  }

  return { valid: true };
}

// Check if payment is test transaction
export function isTestCardNumber(cardNumber: string): boolean {
  const testCards = [
    '4005550000000001', // Visa success
    '4005550000000019', // Visa decline
    '4005554444444460', // Visa 3DS success
    '5123456789012346', // Mastercard success
    '5123456789012353', // Mastercard decline
    '345678901234564', // Amex success
    '345678901234572', // Amex decline
  ];

  const digits = cardNumber.replace(/\D/g, '');
  return testCards.includes(digits);
}

// Generate a test customer for development
export function generateTestCustomer() {
  return {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+61400000000',
    address: '123 Test Street',
    city: 'Sydney',
    state: 'NSW',
    postcode: '2000',
    country: 'AU',
    ip_address: '203.0.113.1',
  };
}
