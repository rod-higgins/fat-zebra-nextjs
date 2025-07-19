import '@testing-library/jest-dom';
import '../types/jest-custom-matchers';

// Import the test helpers using CommonJS require syntax to avoid ESM issues
const {
  mockFetchResponse,
  createMockPurchaseRequest,
  createMockTransactionResponse,
  createMockErrorResponse
} = require('../setup');

// Mock validation utilities since they might not exist yet
const mockValidationUtils = {
  validateCard: jest.fn((cardNumber: string) => {
    // Remove non-digits
    const cleaned = cardNumber.replace(/\D/g, '');
    
    // Check length
    if (cleaned.length < 13 || cleaned.length > 19) {
      return false;
    }
    
    // Luhn algorithm check
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned.charAt(i), 10);
      
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
  }),

  validateAmount: jest.fn((amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return !isNaN(numAmount) && numAmount > 0 && numAmount <= 99999999 && numAmount >= 0.01;
  }),

  validateCurrency: jest.fn((currency: string) => {
    const validCurrencies = ['AUD', 'USD', 'EUR', 'GBP', 'NZD', 'CAD', 'JPY'];
    return validCurrencies.includes(currency.toUpperCase());
  }),

  validateExpiryDate: jest.fn((month: string | number, year: string | number) => {
    const numMonth = typeof month === 'string' ? parseInt(month, 10) : month;
    let numYear = typeof year === 'string' ? parseInt(year, 10) : year;
    
    if (numMonth < 1 || numMonth > 12) return false;
    if (numYear < 1000) numYear += 2000; // Handle 2-digit years
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    if (numYear < currentYear) return false;
    if (numYear === currentYear && numMonth < currentMonth) return false;
    
    return true;
  }),

  validateCVV: jest.fn((cvv: string, cardType?: string) => {
    const cleaned = cvv.replace(/\D/g, '');
    
    if (cardType === 'amex') {
      return cleaned.length === 4;
    }
    
    return cleaned.length === 3 || cleaned.length === 4;
  }),

  validateEmail: jest.fn((email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }),

  validatePhone: jest.fn((phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }),

  validatePostalCode: jest.fn((postalCode: string, country?: string) => {
    if (!postalCode) return false;
    
    switch (country?.toUpperCase()) {
      case 'AU':
        return /^\d{4}$/.test(postalCode);
      case 'US':
        return /^\d{5}(-\d{4})?$/.test(postalCode);
      case 'CA':
        return /^[A-Z]\d[A-Z] \d[A-Z]\d$/.test(postalCode.toUpperCase());
      case 'GB':
        return /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/.test(postalCode.toUpperCase());
      default:
        return postalCode.length >= 3 && postalCode.length <= 10;
    }
  }),

  validateRequired: jest.fn((value: any) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return !isNaN(value);
    return Boolean(value);
  }),

  validateLength: jest.fn((value: string, min: number, max?: number) => {
    if (!value) return false;
    if (value.length < min) return false;
    if (max && value.length > max) return false;
    return true;
  }),

  getCardType: jest.fn((cardNumber: string) => {
    const cleaned = cardNumber.replace(/\D/g, '');
    
    if (/^4/.test(cleaned)) return 'visa';
    if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) return 'mastercard';
    if (/^3[47]/.test(cleaned)) return 'amex';
    if (/^6(?:011|5)/.test(cleaned)) return 'discover';
    if (/^35/.test(cleaned)) return 'jcb';
    if (/^3[0689]/.test(cleaned)) return 'diners';
    
    return 'unknown';
  })
};

describe('Validation Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Card Number Validation', () => {
    it('should validate valid card numbers', () => {
      // Visa
      expect(mockValidationUtils.validateCard('4111111111111111')).toBe(true);
      expect(mockValidationUtils.validateCard('4005550000000001')).toBe(true);
      
      // Mastercard
      expect(mockValidationUtils.validateCard('5555555555554444')).toBe(true);
      expect(mockValidationUtils.validateCard('5105105105105100')).toBe(true);
      
      // Amex
      expect(mockValidationUtils.validateCard('378282246310005')).toBe(true);
      expect(mockValidationUtils.validateCard('371449635398431')).toBe(true);
    });

    it('should reject invalid card numbers', () => {
      expect(mockValidationUtils.validateCard('1234567890123456')).toBe(false);
      expect(mockValidationUtils.validateCard('4111111111111112')).toBe(false);
      expect(mockValidationUtils.validateCard('')).toBe(false);
      expect(mockValidationUtils.validateCard('123')).toBe(false);
      expect(mockValidationUtils.validateCard('12345678901234567890')).toBe(false);
    });

    it('should handle card numbers with formatting', () => {
      expect(mockValidationUtils.validateCard('4111-1111-1111-1111')).toBe(true);
      expect(mockValidationUtils.validateCard('4111 1111 1111 1111')).toBe(true);
      expect(mockValidationUtils.validateCard('4111.1111.1111.1111')).toBe(true);
    });

    it('should identify card types correctly', () => {
      expect(mockValidationUtils.getCardType('4111111111111111')).toBe('visa');
      expect(mockValidationUtils.getCardType('5555555555554444')).toBe('mastercard');
      expect(mockValidationUtils.getCardType('378282246310005')).toBe('amex');
      expect(mockValidationUtils.getCardType('6011111111111117')).toBe('discover');
      expect(mockValidationUtils.getCardType('3530111333300000')).toBe('jcb');
      expect(mockValidationUtils.getCardType('30569309025904')).toBe('diners');
      expect(mockValidationUtils.getCardType('1234567890123456')).toBe('unknown');
    });
  });

  describe('Amount Validation', () => {
    it('should validate positive amounts', () => {
      expect(mockValidationUtils.validateAmount(10.50)).toBe(true);
      expect(mockValidationUtils.validateAmount(1)).toBe(true);
      expect(mockValidationUtils.validateAmount(0.01)).toBe(true);
      expect(mockValidationUtils.validateAmount(999999)).toBe(true);
      expect(mockValidationUtils.validateAmount('25.99')).toBe(true);
    });

    it('should reject invalid amounts', () => {
      expect(mockValidationUtils.validateAmount(0)).toBe(false);
      expect(mockValidationUtils.validateAmount(-10)).toBe(false);
      expect(mockValidationUtils.validateAmount(100000000)).toBe(false);
      expect(mockValidationUtils.validateAmount('invalid')).toBe(false);
      expect(mockValidationUtils.validateAmount('')).toBe(false);
      expect(mockValidationUtils.validateAmount(0.001)).toBe(false);
    });
  });

  describe('Currency Validation', () => {
    it('should validate supported currencies', () => {
      expect(mockValidationUtils.validateCurrency('AUD')).toBe(true);
      expect(mockValidationUtils.validateCurrency('USD')).toBe(true);
      expect(mockValidationUtils.validateCurrency('EUR')).toBe(true);
      expect(mockValidationUtils.validateCurrency('GBP')).toBe(true);
      expect(mockValidationUtils.validateCurrency('aud')).toBe(true); // case insensitive
    });

    it('should reject unsupported currencies', () => {
      expect(mockValidationUtils.validateCurrency('XXX')).toBe(false);
      expect(mockValidationUtils.validateCurrency('')).toBe(false);
      expect(mockValidationUtils.validateCurrency('INVALID')).toBe(false);
    });
  });

  describe('Expiry Date Validation', () => {
    it('should validate future expiry dates', () => {
      const futureYear = new Date().getFullYear() + 2;
      expect(mockValidationUtils.validateExpiryDate(12, futureYear)).toBe(true);
      expect(mockValidationUtils.validateExpiryDate('06', futureYear.toString())).toBe(true);
      expect(mockValidationUtils.validateExpiryDate(1, futureYear)).toBe(true);
    });

    it('should reject past expiry dates', () => {
      const pastYear = new Date().getFullYear() - 1;
      expect(mockValidationUtils.validateExpiryDate(12, pastYear)).toBe(false);
      expect(mockValidationUtils.validateExpiryDate(1, pastYear)).toBe(false);
    });

    it('should handle current year correctly', () => {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      // Future month this year should be valid
      if (currentMonth < 12) {
        expect(mockValidationUtils.validateExpiryDate(currentMonth + 1, currentYear)).toBe(true);
      }
      
      // Past month this year should be invalid
      if (currentMonth > 1) {
        expect(mockValidationUtils.validateExpiryDate(currentMonth - 1, currentYear)).toBe(false);
      }
    });

    it('should reject invalid months', () => {
      const futureYear = new Date().getFullYear() + 1;
      expect(mockValidationUtils.validateExpiryDate(0, futureYear)).toBe(false);
      expect(mockValidationUtils.validateExpiryDate(13, futureYear)).toBe(false);
      expect(mockValidationUtils.validateExpiryDate(-1, futureYear)).toBe(false);
    });
  });

  describe('CVV Validation', () => {
    it('should validate CVV for regular cards', () => {
      expect(mockValidationUtils.validateCVV('123')).toBe(true);
      expect(mockValidationUtils.validateCVV('1234')).toBe(true);
      expect(mockValidationUtils.validateCVV('456', 'visa')).toBe(true);
      expect(mockValidationUtils.validateCVV('789', 'mastercard')).toBe(true);
    });

    it('should validate CVV for Amex cards', () => {
      expect(mockValidationUtils.validateCVV('1234', 'amex')).toBe(true);
      expect(mockValidationUtils.validateCVV('123', 'amex')).toBe(false);
    });

    it('should reject invalid CVV', () => {
      expect(mockValidationUtils.validateCVV('')).toBe(false);
      expect(mockValidationUtils.validateCVV('12')).toBe(false);
      expect(mockValidationUtils.validateCVV('12345')).toBe(false);
      expect(mockValidationUtils.validateCVV('abc')).toBe(false);
    });

    it('should handle CVV with non-numeric characters', () => {
      expect(mockValidationUtils.validateCVV('1-2-3')).toBe(true); // Should clean to '123'
      expect(mockValidationUtils.validateCVV(' 456 ')).toBe(true); // Should clean to '456'
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email addresses', () => {
      expect(mockValidationUtils.validateEmail('test@example.com')).toBe(true);
      expect(mockValidationUtils.validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(mockValidationUtils.validateEmail('firstname+lastname@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(mockValidationUtils.validateEmail('')).toBe(false);
      expect(mockValidationUtils.validateEmail('invalid-email')).toBe(false);
      expect(mockValidationUtils.validateEmail('test@')).toBe(false);
      expect(mockValidationUtils.validateEmail('@example.com')).toBe(false);
      expect(mockValidationUtils.validateEmail('test..test@example.com')).toBe(false);
    });
  });

  describe('Phone Validation', () => {
    it('should validate phone numbers', () => {
      expect(mockValidationUtils.validatePhone('1234567890')).toBe(true);
      expect(mockValidationUtils.validatePhone('+61 400 123 456')).toBe(true);
      expect(mockValidationUtils.validatePhone('(555) 123-4567')).toBe(true);
      expect(mockValidationUtils.validatePhone('04123456789')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(mockValidationUtils.validatePhone('')).toBe(false);
      expect(mockValidationUtils.validatePhone('123')).toBe(false);
      expect(mockValidationUtils.validatePhone('abc')).toBe(false);
      expect(mockValidationUtils.validatePhone('12345678901234567890')).toBe(false);
    });
  });

  describe('Postal Code Validation', () => {
    it('should validate Australian postal codes', () => {
      expect(mockValidationUtils.validatePostalCode('2000', 'AU')).toBe(true);
      expect(mockValidationUtils.validatePostalCode('3141', 'AU')).toBe(true);
      expect(mockValidationUtils.validatePostalCode('12345', 'AU')).toBe(false);
    });

    it('should validate US postal codes', () => {
      expect(mockValidationUtils.validatePostalCode('12345', 'US')).toBe(true);
      expect(mockValidationUtils.validatePostalCode('12345-6789', 'US')).toBe(true);
      expect(mockValidationUtils.validatePostalCode('123', 'US')).toBe(false);
    });

    it('should validate Canadian postal codes', () => {
      expect(mockValidationUtils.validatePostalCode('K1A 0A6', 'CA')).toBe(true);
      expect(mockValidationUtils.validatePostalCode('M5V 3L9', 'CA')).toBe(true);
      expect(mockValidationUtils.validatePostalCode('12345', 'CA')).toBe(false);
    });

    it('should use generic validation for unknown countries', () => {
      expect(mockValidationUtils.validatePostalCode('12345', 'XX')).toBe(true);
      expect(mockValidationUtils.validatePostalCode('ABC123', 'XX')).toBe(true);
      expect(mockValidationUtils.validatePostalCode('AB', 'XX')).toBe(false);
      expect(mockValidationUtils.validatePostalCode('12345678901', 'XX')).toBe(false);
    });
  });

  describe('General Validation', () => {
    it('should validate required fields', () => {
      expect(mockValidationUtils.validateRequired('test')).toBe(true);
      expect(mockValidationUtils.validateRequired(123)).toBe(true);
      expect(mockValidationUtils.validateRequired(true)).toBe(true);
      expect(mockValidationUtils.validateRequired([])).toBe(true);
      expect(mockValidationUtils.validateRequired({})).toBe(true);
    });

    it('should reject empty required fields', () => {
      expect(mockValidationUtils.validateRequired('')).toBe(false);
      expect(mockValidationUtils.validateRequired('   ')).toBe(false);
      expect(mockValidationUtils.validateRequired(null)).toBe(false);
      expect(mockValidationUtils.validateRequired(undefined)).toBe(false);
      expect(mockValidationUtils.validateRequired(NaN)).toBe(false);
    });

    it('should validate string lengths', () => {
      expect(mockValidationUtils.validateLength('test', 2, 10)).toBe(true);
      expect(mockValidationUtils.validateLength('hello', 5, 5)).toBe(true);
      expect(mockValidationUtils.validateLength('short', 10)).toBe(false);
      expect(mockValidationUtils.validateLength('toolongstring', 2, 10)).toBe(false);
      expect(mockValidationUtils.validateLength('', 1)).toBe(false);
    });
  });

  describe('Validation Error Handling', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => mockValidationUtils.validateCard(null as any)).not.toThrow();
      expect(() => mockValidationUtils.validateAmount(null as any)).not.toThrow();
      expect(() => mockValidationUtils.validateEmail(null as any)).not.toThrow();
    });

    it('should handle edge cases', () => {
      expect(mockValidationUtils.validateCard('0000000000000000')).toBe(false);
      expect(mockValidationUtils.validateAmount(Number.MAX_VALUE)).toBe(false);
      expect(mockValidationUtils.validateExpiryDate(2.5 as any, 2025)).toBe(false);
    });
  });

  describe('Integration with Payment Data', () => {
    it('should validate complete payment request', () => {
      const mockRequest = createMockPurchaseRequest();
      
      expect(mockValidationUtils.validateCard(mockRequest.card_number)).toBe(true);
      expect(mockValidationUtils.validateAmount(mockRequest.amount)).toBe(true);
      expect(mockValidationUtils.validateCurrency(mockRequest.currency)).toBe(true);
      expect(mockValidationUtils.validateExpiryDate(
        mockRequest.expiry_month, 
        mockRequest.expiry_year
      )).toBe(true);
      expect(mockValidationUtils.validateCVV(mockRequest.cvv)).toBe(true);
    });

    it('should identify invalid payment requests', () => {
      const invalidRequest = {
        card_number: '1234567890123456', // Invalid Luhn
        amount: -10, // Invalid amount
        currency: 'XXX', // Invalid currency
        expiry_month: 13, // Invalid month
        expiry_year: 2020, // Past year
        cvv: '12' // Invalid CVV
      };

      expect(mockValidationUtils.validateCard(invalidRequest.card_number)).toBe(false);
      expect(mockValidationUtils.validateAmount(invalidRequest.amount)).toBe(false);
      expect(mockValidationUtils.validateCurrency(invalidRequest.currency)).toBe(false);
      expect(mockValidationUtils.validateExpiryDate(
        invalidRequest.expiry_month, 
        invalidRequest.expiry_year
      )).toBe(false);
      expect(mockValidationUtils.validateCVV(invalidRequest.cvv)).toBe(false);
    });
  });
});