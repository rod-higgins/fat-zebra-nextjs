import '@testing-library/jest-dom';
import '../types/jest-custom-matchers';

// Import the test helpers using CommonJS require syntax to avoid ESM issues
const {
  mockFetchResponse,
  createMockPurchaseRequest,
  createMockTransactionResponse,
  createMockErrorResponse
} = require('../setup');

// Import the utility functions using TypeScript import syntax
import {
  validateCard,
  formatCardNumber,
  formatExpiryDate,
  formatCvv,
  validateAmount,
  luhnCheck,
  getCardType,
  extractErrorMessage,
  extractErrorDetails,
  formatCurrency,
  sanitizeCardNumber,
  generateReference,
  isTestCard
} from '../../src/utils';

import {
  detectCardType,
  validateExpiryDate,
  validateCvv,
  validateEmail,
  validatePhone,
  maskCardNumber,
  generateReference as generateRefAlt
} from '../../src/utils/validation';

import { TEST_CARDS, CURRENCIES } from '../../src/types';
import type { CardDetails, CardValidationResult } from '../../src/types';

describe('Card Number Validation', () => {
  describe('luhnCheck', () => {
    it('should validate correct card numbers', () => {
      expect(luhnCheck('4005550000000001')).toBe(true); // Visa test card
      expect(luhnCheck('5123456789012346')).toBe(true); // MasterCard test card
      expect(luhnCheck('345678901234564')).toBe(true);  // Amex test card
    });

    it('should reject invalid card numbers', () => {
      expect(luhnCheck('1234567890123456')).toBe(false);
      expect(luhnCheck('0000000000000000')).toBe(false);
      expect(luhnCheck('4111111111111112')).toBe(false); // Almost valid Visa
    });

    it('should handle card numbers with spaces and dashes', () => {
      expect(luhnCheck('4005 5500 0000 0001')).toBe(true);
      expect(luhnCheck('4005-5500-0000-0001')).toBe(true);
      expect(luhnCheck('4005.5500.0000.0001')).toBe(true);
    });

    it('should handle empty or non-numeric input', () => {
      expect(luhnCheck('')).toBe(false);
      expect(luhnCheck('abc')).toBe(false);
      expect(luhnCheck('123abc456')).toBe(false);
    });
  });

  describe('getCardType / detectCardType', () => {
    it('should detect Visa cards', () => {
      expect(getCardType('4005550000000001')).toBe('visa');
      expect(detectCardType('4005550000000001')).toBe('Visa');
      expect(getCardType('4111111111111111')).toBe('visa');
    });

    it('should detect MasterCard', () => {
      expect(getCardType('5123456789012346')).toBe('mastercard');
      expect(detectCardType('5123456789012346')).toBe('Mastercard');
      expect(getCardType('2223000048400011')).toBe('mastercard'); // New MasterCard range
    });

    it('should detect American Express', () => {
      expect(getCardType('345678901234564')).toBe('amex');
      expect(detectCardType('345678901234564')).toBe('American Express');
      expect(getCardType('378282246310005')).toBe('amex');
    });

    it('should detect Discover', () => {
      expect(getCardType('6011111111111117')).toBe('discover');
      expect(detectCardType('6011111111111117')).toBe('Discover');
    });

    it('should return unknown for unrecognized cards', () => {
      expect(getCardType('1234567890123456')).toBe('unknown');
      expect(detectCardType('1234567890123456')).toBe('Unknown');
      expect(getCardType('9999999999999999')).toBe('unknown');
    });

    it('should handle partial numbers', () => {
      expect(getCardType('4')).toBe('visa');
      expect(getCardType('51')).toBe('mastercard');
      expect(getCardType('34')).toBe('amex');
    });
  });

  describe('validateCard', () => {
    it('should validate complete card details', () => {
      const validCard: CardDetails = {
        card_holder: 'John Doe',
        card_number: '4005550000000001',
        card_expiry: '12/25',
        cvv: '123'
      };

      const result = validateCard(validCard);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.type).toBe('visa');
    });

    it('should reject invalid card numbers', () => {
      const invalidCard: CardDetails = {
        card_holder: 'John Doe',
        card_number: '1234567890123456',
        card_expiry: '12/25',
        cvv: '123'
      };

      const result = validateCard(invalidCard);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid card number');
    });

    it('should validate expiry dates', () => {
      const expiredCard: CardDetails = {
        card_holder: 'John Doe',
        card_number: '4005550000000001',
        card_expiry: '01/20', // Expired
        cvv: '123'
      };

      const result = validateCard(expiredCard);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Card has expired');
    });

    it('should validate CVV', () => {
      const invalidCvvCard: CardDetails = {
        card_holder: 'John Doe',
        card_number: '4005550000000001',
        card_expiry: '12/25',
        cvv: '12' // Too short
      };

      const result = validateCard(invalidCvvCard);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid CVV');
    });

    it('should validate card holder name', () => {
      const noNameCard: CardDetails = {
        card_holder: '',
        card_number: '4005550000000001',
        card_expiry: '12/25',
        cvv: '123'
      };

      const result = validateCard(noNameCard);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Card holder name is required');
    });
  });
});

describe('Card Number Formatting', () => {
  describe('formatCardNumber', () => {
    it('should format Visa cards with 4-4-4-4 pattern', () => {
      expect(formatCardNumber('4005550000000001')).toBe('4005 5500 0000 0001');
      expect(formatCardNumber('4111111111111111')).toBe('4111 1111 1111 1111');
    });

    it('should format American Express with 4-6-5 pattern', () => {
      expect(formatCardNumber('345678901234564')).toBe('3456 789012 34564');
      expect(formatCardNumber('378282246310005')).toBe('3782 822463 10005');
    });

    it('should handle partial numbers', () => {
      expect(formatCardNumber('4005')).toBe('4005');
      expect(formatCardNumber('40055500')).toBe('4005 5500');
      expect(formatCardNumber('400555000000')).toBe('4005 5500 0000');
    });

    it('should remove non-numeric characters', () => {
      expect(formatCardNumber('4005-5500-0000-0001')).toBe('4005 5500 0000 0001');
      expect(formatCardNumber('4005.5500.0000.0001')).toBe('4005 5500 0000 0001');
      expect(formatCardNumber('4005abc5500def0001')).toBe('4005 5500 0001');
    });

    it('should handle empty input', () => {
      expect(formatCardNumber('')).toBe('');
      expect(formatCardNumber('   ')).toBe('');
    });
  });

  describe('formatExpiryDate', () => {
    it('should format expiry dates correctly', () => {
      expect(formatExpiryDate('1225')).toBe('12/25');
      expect(formatExpiryDate('0125')).toBe('01/25');
      expect(formatExpiryDate('1299')).toBe('12/99');
    });

    it('should handle partial input', () => {
      expect(formatExpiryDate('1')).toBe('1');
      expect(formatExpiryDate('12')).toBe('12/');
      expect(formatExpiryDate('123')).toBe('12/3');
    });

    it('should remove non-numeric characters', () => {
      expect(formatExpiryDate('12a25')).toBe('12/25');
      expect(formatExpiryDate('1/2/25')).toBe('12/25');
      expect(formatExpiryDate('12-25')).toBe('12/25');
    });

    it('should handle already formatted input', () => {
      expect(formatExpiryDate('12/25')).toBe('12/25');
      expect(formatExpiryDate('01/99')).toBe('01/99');
    });

    it('should handle empty input', () => {
      expect(formatExpiryDate('')).toBe('');
      expect(formatExpiryDate('abc')).toBe('');
    });
  });

  describe('formatCvv', () => {
    it('should format CVV correctly', () => {
      expect(formatCvv('123')).toBe('123');
      expect(formatCvv('1234')).toBe('1234'); // Amex
    });

    it('should remove non-numeric characters', () => {
      expect(formatCvv('12a3')).toBe('123');
      expect(formatCvv('1-2-3')).toBe('123');
      expect(formatCvv('abc123def')).toBe('123');
    });

    it('should limit to 4 digits', () => {
      expect(formatCvv('12345')).toBe('1234');
      expect(formatCvv('123456789')).toBe('1234');
    });

    it('should handle empty input', () => {
      expect(formatCvv('')).toBe('');
      expect(formatCvv('abc')).toBe('');
    });
  });
});

describe('Validation Functions', () => {
  describe('validateExpiryDate', () => {
    it('should validate correct expiry dates', () => {
      const futureYear = (new Date().getFullYear() + 1) % 100;
      const futureDate = `12/${futureYear.toString().padStart(2, '0')}`;
      
      const result = validateExpiryDate(futureDate);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid formats', () => {
      expect(validateExpiryDate('1225').valid).toBe(false);
      expect(validateExpiryDate('12/2025').valid).toBe(false);
      expect(validateExpiryDate('invalid').valid).toBe(false);
      expect(validateExpiryDate('').valid).toBe(false);
    });

    it('should reject expired dates', () => {
      const result = validateExpiryDate('01/20');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Card has expired');
    });

    it('should reject invalid months', () => {
      const futureYear = (new Date().getFullYear() + 1) % 100;
      const yearStr = futureYear.toString().padStart(2, '0');
      
      expect(validateExpiryDate(`13/${yearStr}`).valid).toBe(false);
      expect(validateExpiryDate(`00/${yearStr}`).valid).toBe(false);
      expect(validateExpiryDate(`99/${yearStr}`).valid).toBe(false);
    });
  });

  describe('validateCvv', () => {
    it('should validate 3-digit CVV for most cards', () => {
      const result = validateCvv('123');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate 4-digit CVV for American Express', () => {
      const result = validateCvv('1234', 'American Express');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject wrong length CVV', () => {
      expect(validateCvv('12').valid).toBe(false);
      expect(validateCvv('12345').valid).toBe(false);
      expect(validateCvv('1234', 'Visa').valid).toBe(false);
      expect(validateCvv('123', 'American Express').valid).toBe(false);
    });

    it('should reject non-numeric CVV', () => {
      expect(validateCvv('abc').valid).toBe(false);
      expect(validateCvv('12a').valid).toBe(false);
    });

    it('should reject empty CVV', () => {
      const result = validateCvv('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('CVV is required');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com').valid).toBe(true);
      expect(validateEmail('user.name@domain.co.uk').valid).toBe(true);
      expect(validateEmail('user+tag@example.org').valid).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid-email').valid).toBe(false);
      expect(validateEmail('@example.com').valid).toBe(false);
      expect(validateEmail('test@').valid).toBe(false);
      expect(validateEmail('test@.com').valid).toBe(false);
    });

    it('should reject empty email', () => {
      const result = validateEmail('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Email is required');
    });
  });

  describe('validatePhone', () => {
    it('should validate correct phone numbers', () => {
      expect(validatePhone('+61412345678').valid).toBe(true);
      expect(validatePhone('0412345678').valid).toBe(true);
      expect(validatePhone('(02) 1234 5678').valid).toBe(true);
    });

    it('should allow empty phone (optional field)', () => {
      expect(validatePhone('').valid).toBe(true);
      expect(validatePhone('   ').valid).toBe(true);
    });

    it('should reject too short phone numbers', () => {
      expect(validatePhone('123456').valid).toBe(false);
      expect(validatePhone('12345').valid).toBe(false);
    });
  });

  describe('validateAmount', () => {
    it('should validate positive amounts', () => {
      expect(validateAmount(10.50)).toBe(true);
      expect(validateAmount(0.01)).toBe(true);
      expect(validateAmount(1000)).toBe(true);
    });

    it('should reject invalid amounts', () => {
      expect(validateAmount(0)).toBe(false);
      expect(validateAmount(-10)).toBe(false);
      expect(validateAmount(NaN)).toBe(false);
      expect(validateAmount(Infinity)).toBe(false);
    });
  });
});

describe('Utility Functions', () => {
  describe('formatCurrency', () => {
    it('should format AUD currency', () => {
      expect(formatCurrency(25.50, 'AUD')).toContain('25.50');
      expect(formatCurrency(1000, 'AUD')).toContain('1,000.00');
    });

    it('should format USD currency', () => {
      expect(formatCurrency(25.50, 'USD')).toContain('25.50');
      expect(formatCurrency(1000, 'USD')).toContain('1,000.00');
    });

    it('should handle unsupported currencies with fallback', () => {
      const result = formatCurrency(25.50, 'XYZ');
      expect(result).toContain('XYZ');
      expect(result).toContain('25.50');
    });
  });

  describe('sanitizeCardNumber / maskCardNumber', () => {
    it('should mask card numbers for logging', () => {
      expect(sanitizeCardNumber('4005550000000001')).toBe('**** **** **** 0001');
      expect(maskCardNumber('4005550000000001')).toContain('0001');
    });

    it('should handle short card numbers', () => {
      expect(sanitizeCardNumber('123')).toBe('****');
      expect(sanitizeCardNumber('')).toBe('****');
    });

    it('should maintain formatting', () => {
      const masked = maskCardNumber('4005550000000001');
      expect(masked).toMatch(/\*+ 0001$/);
    });
  });

  describe('generateReference', () => {
    it('should generate unique references', () => {
      const ref1 = generateReference();
      const ref2 = generateReference();
      
      expect(ref1).not.toBe(ref2);
      expect(ref1).toMatch(/^TXN-\d+-[A-Z0-9]+$/);
    });

    it('should use custom prefix', () => {
      const ref = generateReference('ORDER');
      expect(ref).toMatch(/^ORDER-\d+-[A-Z0-9]+$/);
    });

    // Test alternative function name
    it('should generate references with alternative function', () => {
      const ref = generateRefAlt('TEST');
      expect(ref).toMatch(/^TEST-\d+-[A-Z0-9]+$/);
    });
  });

  describe('isTestCard', () => {
    it('should identify test cards', () => {
      expect(isTestCard('4005550000000001')).toBe(true); // Visa Success
      expect(isTestCard('5123456789012346')).toBe(true); // MasterCard Success
      expect(isTestCard('345678901234564')).toBe(true);  // Amex Success
      expect(isTestCard('4005550000000019')).toBe(true); // Visa Decline
    });

    it('should identify non-test cards', () => {
      expect(isTestCard('4111111111111111')).toBe(false);
      expect(isTestCard('1234567890123456')).toBe(false);
    });

    it('should handle card numbers with formatting', () => {
      expect(isTestCard('4005 5500 0000 0001')).toBe(true);
      expect(isTestCard('4005-5500-0000-0001')).toBe(true);
    });
  });
});

describe('Error Handling Utilities', () => {
  describe('extractErrorMessage', () => {
    it('should extract message from string', () => {
      expect(extractErrorMessage('Simple error')).toBe('Simple error');
    });

    it('should extract message from Error object', () => {
      const error = new Error('Test error message');
      expect(extractErrorMessage(error)).toBe('Test error message');
    });

    it('should extract message from object with message property', () => {
      const error = { message: 'Object error message' };
      expect(extractErrorMessage(error)).toBe('Object error message');
    });

    it('should handle unknown error types', () => {
      expect(extractErrorMessage(null)).toBe('An unknown error occurred');
      expect(extractErrorMessage(undefined)).toBe('An unknown error occurred');
      expect(extractErrorMessage({})).toBe('An unknown error occurred');
      expect(extractErrorMessage(123)).toBe('An unknown error occurred');
    });
  });

  describe('extractErrorDetails', () => {
    it('should extract details from various error types', () => {
      expect(extractErrorDetails('Simple error')).toEqual(['Simple error']);
      
      const error = new Error('Test error');
      expect(extractErrorDetails(error)).toEqual(['Test error']);
      
      const errorWithDetails = { errors: ['Error 1', 'Error 2'] };
      expect(extractErrorDetails(errorWithDetails)).toEqual(['Error 1', 'Error 2']);
    });

    it('should handle unknown error types', () => {
      expect(extractErrorDetails(null)).toEqual(['An unknown error occurred']);
      expect(extractErrorDetails({})).toEqual(['An unknown error occurred']);
    });
  });
});

describe('Constants and Test Data', () => {
  describe('TEST_CARDS', () => {
    it('should have valid test card numbers', () => {
      expect(TEST_CARDS.VISA_SUCCESS).toBeValidCardNumber();
      expect(TEST_CARDS.MASTERCARD_SUCCESS).toBeValidCardNumber();
      expect(TEST_CARDS.AMEX_SUCCESS).toBeValidCardNumber();
    });

    it('should include decline cards', () => {
      expect(TEST_CARDS.VISA_DECLINE).toBeDefined();
      expect(TEST_CARDS.MASTERCARD_DECLINE).toBeDefined();
      expect(TEST_CARDS.AMEX_DECLINE).toBeDefined();
    });

    it('should have properly formatted card numbers', () => {
      Object.values(TEST_CARDS).forEach(cardNumber => {
        expect(typeof cardNumber).toBe('string');
        expect(cardNumber).toMatch(/^\d{13,19}$/);
      });
    });
  });

  describe('CURRENCIES', () => {
    it('should include major currencies', () => {
      expect(CURRENCIES.AUD).toBe('AUD');
      expect(CURRENCIES.USD).toBe('USD');
      expect(CURRENCIES.EUR).toBe('EUR');
      expect(CURRENCIES.GBP).toBe('GBP');
    });

    it('should have valid currency codes', () => {
      Object.values(CURRENCIES).forEach(currency => {
        expect(typeof currency).toBe('string');
        expect(currency).toMatch(/^[A-Z]{3}$/);
      });
    });
  });
});

describe('TypeScript Type Validation', () => {
  it('should provide proper TypeScript types for validation results', () => {
    const cardDetails: CardDetails = {
      card_holder: 'John Doe',
      card_number: '4005550000000001',
      card_expiry: '12/25',
      cvv: '123'
    };

    const result: CardValidationResult = validateCard(cardDetails);
    
    expect(typeof result.valid).toBe('boolean');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(typeof result.type).toBe('string');
  });

  it('should handle type checking for utility functions', () => {
    // Type checking - these should compile without errors
    const cardNumber: string = '4005550000000001';
    const isValid: boolean = luhnCheck(cardNumber);
    const cardType: string = getCardType(cardNumber);
    const formatted: string = formatCardNumber(cardNumber);
    
    expect(typeof isValid).toBe('boolean');
    expect(typeof cardType).toBe('string');
    expect(typeof formatted).toBe('string');
  });
});

describe('Integration Tests', () => {
  it('should work with all formatting functions together', () => {
    const rawCardNumber = '4005550000000001';
    const rawExpiry = '1225';
    const rawCvv = '123abc';

    const formattedCard = formatCardNumber(rawCardNumber);
    const formattedExpiry = formatExpiryDate(rawExpiry);
    const formattedCvv = formatCvv(rawCvv);

    expect(formattedCard).toBe('4005 5500 0000 0001');
    expect(formattedExpiry).toBe('12/25');
    expect(formattedCvv).toBe('123');

    // Validate the formatted data
    expect(luhnCheck(formattedCard)).toBe(true);
    expect(validateExpiryDate(formattedExpiry).valid).toBe(true);
    expect(validateCvv(formattedCvv).valid).toBe(true);
  });

  it('should handle complete card validation workflow', () => {
    const cardDetails: CardDetails = {
      card_holder: 'John Doe',
      card_number: formatCardNumber('4005550000000001'),
      card_expiry: formatExpiryDate('1225'),
      cvv: formatCvv('123')
    };

    const validation = validateCard(cardDetails);
    expect(validation.valid).toBe(true);
    expect(validation.type).toBe('visa');
    expect(validation.errors).toHaveLength(0);
  });

  it('should work with test helpers', () => {
    const mockRequest = createMockPurchaseRequest();
    const mockResponse = createMockTransactionResponse();
    
    expect(mockRequest.card_number).toBeValidCardNumber();
    expect(mockResponse.successful).toBe(true);
    
    // Validate that the mock data works with our formatting functions
    const formattedCard = formatCardNumber(mockRequest.card_number);
    expect(formattedCard).toContain(' '); // Should have spaces
    expect(luhnCheck(mockRequest.card_number)).toBe(true);
  });
});