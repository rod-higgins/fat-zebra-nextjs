import '@testing-library/jest-dom';
import '../types/jest-custom-matchers';

// Import the test helpers using CommonJS require syntax to avoid ESM issues
const {
  mockFetchResponse,
  createMockPurchaseRequest,
  createMockTransactionResponse,
  createMockErrorResponse
} = require('../setup');

// Import the utility functions from the main utils index
import {
  validateCard,
  formatCardNumber,
  formatExpiryDate,
  formatCvv,
  validateAmount,
  generateVerificationHash,
  extractErrorMessage,
  extractErrorDetails,
  formatCurrency,
  sanitizeCardNumber,
  generateReference,
  isTestCard,
  luhnCheck,
  getCardType,
  delay,
  retryWithBackoff
} from '../../src/utils';

import { FatZebraError, TEST_CARDS, CURRENCIES } from '../../src/types';
import type { CardDetails, CardValidationResult, VerificationHashData } from '../../src/types';

describe('Main Utils - Card Validation', () => {
  describe('luhnCheck', () => {
    it('should validate test cards', () => {
      expect(luhnCheck(TEST_CARDS.VISA_SUCCESS)).toBe(true);
      expect(luhnCheck(TEST_CARDS.MASTERCARD_SUCCESS)).toBe(true);
      expect(luhnCheck(TEST_CARDS.AMEX_SUCCESS)).toBe(true);
    });

    it('should invalidate incorrect numbers', () => {
      expect(luhnCheck('1234567890123456')).toBe(false);
      expect(luhnCheck('4111111111111112')).toBe(false);
    });

    it('should handle formatted card numbers', () => {
      expect(luhnCheck('4005 5500 0000 0001')).toBe(true);
      expect(luhnCheck('4005-5500-0000-0001')).toBe(true);
    });
  });

  describe('getCardType', () => {
    it('should detect card types correctly', () => {
      expect(getCardType('4005550000000001')).toBe('visa');
      expect(getCardType('5123456789012346')).toBe('mastercard');
      expect(getCardType('345678901234564')).toBe('amex');
      expect(getCardType('6011111111111117')).toBe('discover');
    });

    it('should return unknown for invalid cards', () => {
      expect(getCardType('1234567890123456')).toBe('unknown');
      expect(getCardType('')).toBe('unknown');
    });
  });

  describe('validateCard', () => {
    it('should validate complete card details', () => {
      const cardDetails: CardDetails = {
        card_holder: 'John Doe',
        card_number: '4005550000000001',
        card_expiry: '12/25',
        cvv: '123'
      };

      const result = validateCard(cardDetails);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.type).toBe('visa');
    });

    it('should reject invalid card details', () => {
      const invalidCard: CardDetails = {
        card_holder: '',
        card_number: '1234567890123456',
        card_expiry: '13/20',
        cvv: '12'
      };

      const result = validateCard(invalidCard);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
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
  });
});

describe('Main Utils - Card Formatting', () => {
  describe('formatCardNumber', () => {
    it('should format different card types', () => {
      expect(formatCardNumber('4005550000000001')).toBe('4005 5500 0000 0001');
      expect(formatCardNumber('5123456789012346')).toBe('5123 4567 8901 2346');
    });

    it('should handle partial numbers', () => {
      expect(formatCardNumber('4005')).toBe('4005');
      expect(formatCardNumber('40055500')).toBe('4005 5500');
    });

    it('should remove non-numeric characters', () => {
      expect(formatCardNumber('4005-5500-0000-0001')).toBe('4005 5500 0000 0001');
      expect(formatCardNumber('4005abc5500def0001')).toBe('4005 5500 0001');
    });
  });

  describe('formatExpiryDate', () => {
    it('should format expiry dates', () => {
      expect(formatExpiryDate('1225')).toBe('12/25');
      expect(formatExpiryDate('0125')).toBe('01/25');
    });

    it('should handle partial input', () => {
      expect(formatExpiryDate('1')).toBe('1');
      expect(formatExpiryDate('12')).toBe('12/');
    });

    it('should remove non-numeric characters', () => {
      expect(formatExpiryDate('12a25')).toBe('12/25');
      expect(formatExpiryDate('12-25')).toBe('12/25');
    });
  });

  describe('formatCvv', () => {
    it('should format CVV correctly', () => {
      expect(formatCvv('123')).toBe('123');
      expect(formatCvv('1234')).toBe('1234');
    });

    it('should remove non-numeric characters', () => {
      expect(formatCvv('12a3')).toBe('123');
      expect(formatCvv('1-2-3')).toBe('123');
    });

    it('should limit to 4 digits', () => {
      expect(formatCvv('12345')).toBe('1234');
      expect(formatCvv('123456789')).toBe('1234');
    });
  });
});

describe('Amount Validation', () => {
  describe('validateAmount', () => {
    it('should validate positive amounts', () => {
      expect(validateAmount(10.50)).toBe(true);
      expect(validateAmount(1)).toBe(true);
      expect(validateAmount(0.01)).toBe(true);
    });

    it('should reject invalid amounts', () => {
      expect(validateAmount(0)).toBe(false);
      expect(validateAmount(-10)).toBe(false);
      expect(validateAmount(NaN)).toBe(false);
      expect(validateAmount(Infinity)).toBe(false);
    });
  });
});

describe('Currency and Display Utilities', () => {
  describe('formatCurrency', () => {
    it('should format AUD correctly', () => {
      const result = formatCurrency(25.50, 'AUD');
      expect(result).toContain('25.50');
      expect(typeof result).toBe('string');
    });

    it('should format USD correctly', () => {
      const result = formatCurrency(1000, 'USD');
      expect(result).toContain('1,000.00');
      expect(typeof result).toBe('string');
    });

    it('should handle unsupported currencies', () => {
      const result = formatCurrency(25.50, 'XYZ');
      expect(result).toContain('XYZ');
      expect(result).toContain('25.50');
    });
  });

  describe('sanitizeCardNumber', () => {
    it('should mask card numbers for display', () => {
      expect(sanitizeCardNumber('4005550000000001')).toBe('**** **** **** 0001');
      expect(sanitizeCardNumber('345678901234564')).toBe('**** **** **** 4564');
    });

    it('should handle short card numbers', () => {
      expect(sanitizeCardNumber('123')).toBe('****');
      expect(sanitizeCardNumber('')).toBe('****');
    });
  });
});

describe('Reference Generation', () => {
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

    it('should generate different references each time', () => {
      const refs = Array(10).fill(null).map(() => generateReference());
      const uniqueRefs = new Set(refs);
      expect(uniqueRefs.size).toBe(10);
    });
  });
});

describe('Test Card Utilities', () => {
  describe('isTestCard', () => {
    it('should identify test cards', () => {
      expect(isTestCard(TEST_CARDS.VISA_SUCCESS)).toBe(true);
      expect(isTestCard(TEST_CARDS.MASTERCARD_SUCCESS)).toBe(true);
      expect(isTestCard(TEST_CARDS.AMEX_SUCCESS)).toBe(true);
      expect(isTestCard(TEST_CARDS.VISA_DECLINE)).toBe(true);
    });

    it('should identify non-test cards', () => {
      expect(isTestCard('4111111111111111')).toBe(false);
      expect(isTestCard('1234567890123456')).toBe(false);
    });

    it('should handle formatted card numbers', () => {
      expect(isTestCard('4005 5500 0000 0001')).toBe(true);
      expect(isTestCard('4005-5500-0000-0001')).toBe(true);
    });
  });
});

describe('Verification Hash Generation', () => {
  describe('generateVerificationHash', () => {
    it('should generate consistent hashes', () => {
      const data: VerificationHashData = {
        amount: 2500,
        currency: 'AUD',
        reference: 'TEST-123',
        timestamp: 1234567890
      };
      const secret = 'test-secret';

      const hash1 = generateVerificationHash(data, secret);
      const hash2 = generateVerificationHash(data, secret);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(64); // SHA-256 hex length
    });

    it('should generate different hashes for different data', () => {
      const data1: VerificationHashData = {
        amount: 2500,
        currency: 'AUD',
        reference: 'TEST-123',
        timestamp: 1234567890
      };

      const data2: VerificationHashData = {
        amount: 3000,
        currency: 'AUD',
        reference: 'TEST-123',
        timestamp: 1234567890
      };

      const secret = 'test-secret';
      const hash1 = generateVerificationHash(data1, secret);
      const hash2 = generateVerificationHash(data2, secret);

      expect(hash1).not.toBe(hash2);
    });

    it('should include optional card_token in hash', () => {
      const data: VerificationHashData = {
        amount: 2500,
        currency: 'AUD',
        reference: 'TEST-123',
        card_token: 'token-123',
        timestamp: 1234567890
      };
      const secret = 'test-secret';

      const hash = generateVerificationHash(data, secret);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
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

    it('should extract message from FatZebraError', () => {
      const error = new FatZebraError('FZ error', ['Error 1', 'Error 2']);
      expect(extractErrorMessage(error)).toBe('Error 1');
    });

    it('should handle FatZebraError with no errors array', () => {
      const error = new FatZebraError('FZ error', []);
      expect(extractErrorMessage(error)).toBe('FZ error');
    });

    it('should handle unknown error types', () => {
      expect(extractErrorMessage(null)).toBe('An unknown error occurred');
      expect(extractErrorMessage(undefined)).toBe('An unknown error occurred');
      expect(extractErrorMessage({})).toBe('An unknown error occurred');
      expect(extractErrorMessage(123)).toBe('An unknown error occurred');
    });
  });

  describe('extractErrorDetails', () => {
    it('should extract details from FatZebraError', () => {
      const error = new FatZebraError('FZ error', ['Error 1', 'Error 2']);
      expect(extractErrorDetails(error)).toEqual(['Error 1', 'Error 2']);
    });

    it('should extract details from object with errors array', () => {
      const errorObj = { errors: ['Error 1', 'Error 2'] };
      expect(extractErrorDetails(errorObj)).toEqual(['Error 1', 'Error 2']);
    });

    it('should extract details from regular Error', () => {
      const error = new Error('Regular error');
      expect(extractErrorDetails(error)).toEqual(['Regular error']);
    });

    it('should handle string errors', () => {
      expect(extractErrorDetails('String error')).toEqual(['String error']);
    });

    it('should handle unknown error types', () => {
      expect(extractErrorDetails(null)).toEqual(['An unknown error occurred']);
      expect(extractErrorDetails({})).toEqual(['An unknown error occurred']);
    });
  });
});

describe('Async Utilities', () => {
  describe('delay', () => {
    it('should delay execution', async () => {
      const start = Date.now();
      await delay(50);
      const duration = Date.now() - start;
      
      expect(duration).toBeGreaterThanOrEqual(45); // Allow some variance
      expect(duration).toBeLessThan(100);
    });

    it('should handle zero delay', async () => {
      const start = Date.now();
      await delay(0);
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(10);
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first try', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(mockFn, 3, 10);
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry failed operations', async () => {
      let attempts = 0;
      const mockFn = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return 'success';
      });

      const result = await retryWithBackoff(mockFn, 3, 10);
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Always fails'));

      await expect(retryWithBackoff(mockFn, 2, 10)).rejects.toThrow('Always fails');
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use exponential backoff', async () => {
      let attempts = 0;
      const delays: number[] = [];
      const originalDelay = delay;
      
      // Mock delay to track timing
      const mockDelay = jest.fn().mockImplementation((ms: number) => {
        delays.push(ms);
        return originalDelay(1); // Speed up for testing
      });

      // Temporarily replace delay function
      const delayModule = require('@/utils');
      delayModule.delay = mockDelay;

      const mockFn = jest.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return 'success';
      });

      await retryWithBackoff(mockFn, 3, 100);
      
      // Should have exponential backoff: 100ms, 200ms
      expect(delays).toEqual([100, 200]);
      
      // Restore original delay
      delayModule.delay = originalDelay;
    });
  });
});

describe('Constants and Type Validation', () => {
  describe('TEST_CARDS', () => {
    it('should have all required test cards', () => {
      expect(TEST_CARDS.VISA_SUCCESS).toBeValidCardNumber();
      expect(TEST_CARDS.MASTERCARD_SUCCESS).toBeValidCardNumber();
      expect(TEST_CARDS.AMEX_SUCCESS).toBeValidCardNumber();
      expect(TEST_CARDS.VISA_DECLINE).toBeValidCardNumber();
      expect(TEST_CARDS.MASTERCARD_DECLINE).toBeValidCardNumber();
      expect(TEST_CARDS.AMEX_DECLINE).toBeValidCardNumber();
    });

    it('should have properly formatted card numbers', () => {
      Object.values(TEST_CARDS).forEach(cardNumber => {
        expect(typeof cardNumber).toBe('string');
        expect(cardNumber).toMatch(/^\d{13,19}$/);
        expect(luhnCheck(cardNumber)).toBe(true);
      });
    });
  });

  describe('CURRENCIES', () => {
    it('should include major currencies', () => {
      expect(CURRENCIES.AUD).toBe('AUD');
      expect(CURRENCIES.USD).toBe('USD');
      expect(CURRENCIES.EUR).toBe('EUR');
      expect(CURRENCIES.GBP).toBe('GBP');
      expect(CURRENCIES.NZD).toBe('NZD');
    });

    it('should have valid currency codes', () => {
      Object.values(CURRENCIES).forEach(currency => {
        expect(typeof currency).toBe('string');
        expect(currency).toMatch(/^[A-Z]{3}$/);
      });
    });
  });
});

describe('Integration Tests', () => {
  it('should work with mock data from test helpers', () => {
    const mockRequest = createMockPurchaseRequest();
    const mockResponse = createMockTransactionResponse();
    
    // Validate mock request data with our utilities
    expect(mockRequest.card_number).toBeValidCardNumber();
    expect(luhnCheck(mockRequest.card_number)).toBe(true);
    expect(isTestCard(mockRequest.card_number)).toBe(true);
    
    // Validate mock response
    expect(mockResponse.successful).toBe(true);
    expect(mockResponse.response).toBeDefined();
  });

  it('should handle complete validation workflow', () => {
    const rawCardData = {
      card_holder: '  John Doe  ',
      card_number: '4005-5500-0000-0001',
      card_expiry: '1225',
      cvv: '123abc'
    };

    // Format and validate
    const formattedCard = formatCardNumber(rawCardData.card_number);
    const formattedExpiry = formatExpiryDate(rawCardData.card_expiry);
    const formattedCvv = formatCvv(rawCardData.cvv);

    const cardDetails: CardDetails = {
      card_holder: rawCardData.card_holder.trim(),
      card_number: formattedCard,
      card_expiry: formattedExpiry,
      cvv: formattedCvv
    };

    const validation = validateCard(cardDetails);
    expect(validation.valid).toBe(true);
    expect(validation.type).toBe('visa');
    expect(validation.errors).toHaveLength(0);
  });

  it('should provide type-safe operations', () => {
    // Type checking - these should compile without errors
    const cardNumber: string = TEST_CARDS.VISA_SUCCESS;
    const isValid: boolean = luhnCheck(cardNumber);
    const cardType: string = getCardType(cardNumber);
    const formatted: string = formatCardNumber(cardNumber);
    const reference: string = generateReference();
    const amount: number = 25.50;
    const isValidAmount: boolean = validateAmount(amount);
    
    expect(typeof isValid).toBe('boolean');
    expect(typeof cardType).toBe('string');
    expect(typeof formatted).toBe('string');
    expect(typeof reference).toBe('string');
    expect(typeof isValidAmount).toBe('boolean');
  });
});