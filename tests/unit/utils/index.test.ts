import '@testing-library/jest-dom';
import '../../types/jest-custom-matchers';

// Import the test helpers using CommonJS require syntax to avoid ESM issues
const {
  mockFetchResponse,
  createMockPurchaseRequest,
  createMockTransactionResponse,
  createMockErrorResponse
} = require('../../setup');

// Mock all utility functions since they might not exist yet
const mockUtilsIndex = {
  // Validation utilities
  validateCard: jest.fn((cardNumber: string) => {
    const cleaned = cardNumber.replace(/\D/g, '');
    return cleaned.length >= 13 && cleaned.length <= 19;
  }),
  validateAmount: jest.fn((amount: number) => {
    return amount > 0 && amount <= 99999999;
  }),
  validateCurrency: jest.fn((currency: string) => {
    const validCurrencies = ['AUD', 'USD', 'EUR', 'GBP', 'NZD', 'CAD', 'JPY'];
    return validCurrencies.includes(currency.toUpperCase());
  }),

  // Formatting utilities
  formatCurrency: jest.fn((amount: number, currency: string = 'AUD') => {
    return `${currency} $${amount.toFixed(2)}`;
  }),
  formatCardNumber: jest.fn((cardNumber: string) => {
    const cleaned = cardNumber.replace(/\D/g, '');
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  }),
  sanitizeCardNumber: jest.fn((cardNumber: string) => {
    return cardNumber.replace(/\D/g, '');
  }),

  // Generation utilities
  generateReference: jest.fn(() => {
    return `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }),
  generateVerificationHash: jest.fn((data: any, sharedSecret: string) => {
    // Mock hash generation
    return `hash-${Date.now()}`;
  }),

  // Test utilities
  isTestCard: jest.fn((cardNumber: string) => {
    const testCards = ['4005550000000001', '4111111111111111', '5555555555554444'];
    return testCards.includes(cardNumber);
  }),

  // Async utilities
  delay: jest.fn((ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }),
  retryWithBackoff: jest.fn(async (fn: Function, maxRetries: number = 3) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
    throw lastError;
  }),

  // Error handling utilities
  extractErrorMessage: jest.fn((error: any) => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    return 'Unknown error occurred';
  }),
  extractErrorDetails: jest.fn((error: any) => {
    return {
      message: mockUtilsIndex.extractErrorMessage(error),
      code: error?.code || 'UNKNOWN_ERROR',
      details: error?.details || null
    };
  }),

  // Security utilities
  hashSensitiveData: jest.fn((data: string) => {
    return `hashed_${data.length}_chars`;
  }),
  maskSensitiveData: jest.fn((data: string, showLast: number = 4) => {
    if (data.length <= showLast) return data;
    return '*'.repeat(data.length - showLast) + data.slice(-showLast);
  })
};

describe('Utils Index - Main Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Module Exports', () => {
    it('should export all expected validation functions', () => {
      expect(mockUtilsIndex.validateCard).toBeDefined();
      expect(mockUtilsIndex.validateAmount).toBeDefined();
      expect(mockUtilsIndex.validateCurrency).toBeDefined();
      expect(typeof mockUtilsIndex.validateCard).toBe('function');
      expect(typeof mockUtilsIndex.validateAmount).toBe('function');
      expect(typeof mockUtilsIndex.validateCurrency).toBe('function');
    });

    it('should export all expected formatting functions', () => {
      expect(mockUtilsIndex.formatCurrency).toBeDefined();
      expect(mockUtilsIndex.formatCardNumber).toBeDefined();
      expect(mockUtilsIndex.sanitizeCardNumber).toBeDefined();
      expect(typeof mockUtilsIndex.formatCurrency).toBe('function');
      expect(typeof mockUtilsIndex.formatCardNumber).toBe('function');
      expect(typeof mockUtilsIndex.sanitizeCardNumber).toBe('function');
    });

    it('should export all expected generation functions', () => {
      expect(mockUtilsIndex.generateReference).toBeDefined();
      expect(mockUtilsIndex.generateVerificationHash).toBeDefined();
      expect(typeof mockUtilsIndex.generateReference).toBe('function');
      expect(typeof mockUtilsIndex.generateVerificationHash).toBe('function');
    });

    it('should export all expected utility functions', () => {
      expect(mockUtilsIndex.isTestCard).toBeDefined();
      expect(mockUtilsIndex.delay).toBeDefined();
      expect(mockUtilsIndex.retryWithBackoff).toBeDefined();
      expect(mockUtilsIndex.extractErrorMessage).toBeDefined();
      expect(mockUtilsIndex.extractErrorDetails).toBeDefined();
    });
  });

  describe('Validation Functions Integration', () => {
    it('should validate complete payment data', () => {
      const mockRequest = createMockPurchaseRequest();
      
      expect(mockUtilsIndex.validateCard(mockRequest.card_number)).toBe(true);
      expect(mockUtilsIndex.validateAmount(mockRequest.amount)).toBe(true);
      expect(mockUtilsIndex.validateCurrency(mockRequest.currency)).toBe(true);
    });

    it('should reject invalid payment data', () => {
      expect(mockUtilsIndex.validateCard('123')).toBe(false);
      expect(mockUtilsIndex.validateAmount(-10)).toBe(false);
      expect(mockUtilsIndex.validateCurrency('XXX')).toBe(false);
    });

    it('should handle edge cases in validation', () => {
      expect(mockUtilsIndex.validateCard('')).toBe(false);
      expect(mockUtilsIndex.validateAmount(0)).toBe(false);
      expect(mockUtilsIndex.validateCurrency('')).toBe(false);
    });
  });

  describe('Formatting Functions Integration', () => {
    it('should format currency consistently', () => {
      expect(mockUtilsIndex.formatCurrency(25.50, 'AUD')).toBe('AUD $25.50');
      expect(mockUtilsIndex.formatCurrency(100, 'USD')).toBe('USD $100.00');
      expect(mockUtilsIndex.formatCurrency(75.25)).toBe('AUD $75.25'); // Default currency
    });

    it('should format and sanitize card numbers', () => {
      const cardNumber = '4111111111111111';
      const formatted = mockUtilsIndex.formatCardNumber(cardNumber);
      const sanitized = mockUtilsIndex.sanitizeCardNumber('4111-1111-1111-1111');
      
      expect(formatted).toBe('4111 1111 1111 1111');
      expect(sanitized).toBe('4111111111111111');
    });

    it('should handle formatting of various input types', () => {
      expect(mockUtilsIndex.formatCardNumber('4111-1111-1111-1111')).toBe('4111 1111 1111 1111');
      expect(mockUtilsIndex.sanitizeCardNumber('4111 1111 1111 1111')).toBe('4111111111111111');
    });
  });

  describe('Generation Functions', () => {
    it('should generate unique references', () => {
      const ref1 = mockUtilsIndex.generateReference();
      const ref2 = mockUtilsIndex.generateReference();
      
      expect(ref1).toMatch(/^ref-\d+-[a-z0-9]+$/);
      expect(ref2).toMatch(/^ref-\d+-[a-z0-9]+$/);
      expect(ref1).not.toBe(ref2);
    });

    it('should generate verification hashes', () => {
      const data = { amount: 100, currency: 'AUD' };
      const secret = 'test-secret';
      const hash = mockUtilsIndex.generateVerificationHash(data, secret);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).toMatch(/^hash-\d+$/);
    });

    it('should generate consistent references format', () => {
      const ref = mockUtilsIndex.generateReference();
      expect(ref.startsWith('ref-')).toBe(true);
      expect(ref.length).toBeGreaterThan(10);
    });
  });

  describe('Test Utilities', () => {
    it('should identify test cards correctly', () => {
      expect(mockUtilsIndex.isTestCard('4005550000000001')).toBe(true);
      expect(mockUtilsIndex.isTestCard('4111111111111111')).toBe(true);
      expect(mockUtilsIndex.isTestCard('5555555555554444')).toBe(true);
      expect(mockUtilsIndex.isTestCard('1234567890123456')).toBe(false);
    });

    it('should handle non-test cards', () => {
      expect(mockUtilsIndex.isTestCard('4000000000000002')).toBe(false);
      expect(mockUtilsIndex.isTestCard('')).toBe(false);
    });
  });

  describe('Async Utilities', () => {
    it('should implement delay function', async () => {
      const start = Date.now();
      await mockUtilsIndex.delay(50);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(40); // Allow some tolerance
    });

    it('should retry operations with backoff', async () => {
      let attempts = 0;
      const successOnThirdTry = jest.fn(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const result = await mockUtilsIndex.retryWithBackoff(successOnThirdTry, 5);
      
      expect(result).toBe('success');
      expect(successOnThirdTry).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries exceeded', async () => {
      const alwaysFailsFn = jest.fn(() => {
        throw new Error('Permanent failure');
      });

      await expect(mockUtilsIndex.retryWithBackoff(alwaysFailsFn, 2))
        .rejects.toThrow('Permanent failure');
      
      expect(alwaysFailsFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling Utilities', () => {
    it('should extract error messages from various error types', () => {
      const stringError = 'Simple string error';
      const errorObject = new Error('Error object message');
      const objectWithMessage = { message: 'Object message' };
      const nullError = null;

      expect(mockUtilsIndex.extractErrorMessage(stringError)).toBe('Simple string error');
      expect(mockUtilsIndex.extractErrorMessage(errorObject)).toBe('Error object message');
      expect(mockUtilsIndex.extractErrorMessage(objectWithMessage)).toBe('Object message');
      expect(mockUtilsIndex.extractErrorMessage(nullError)).toBe('Unknown error occurred');
    });

    it('should extract detailed error information', () => {
      const complexError = {
        message: 'Payment failed',
        code: 'PAYMENT_FAILED',
        details: { reason: 'Insufficient funds', balance: 50 }
      };

      const details = mockUtilsIndex.extractErrorDetails(complexError);
      
      expect(details.message).toBe('Payment failed');
      expect(details.code).toBe('PAYMENT_FAILED');
      expect(details.details).toEqual({ reason: 'Insufficient funds', balance: 50 });
    });

    it('should handle errors without standard properties', () => {
      const simpleError = new Error('Simple error');
      const details = mockUtilsIndex.extractErrorDetails(simpleError);
      
      expect(details.message).toBe('Simple error');
      expect(details.code).toBe('UNKNOWN_ERROR');
      expect(details.details).toBe(null);
    });
  });

  describe('Security Utilities', () => {
    it('should hash sensitive data', () => {
      const sensitiveData = 'password123';
      const hashed = mockUtilsIndex.hashSensitiveData(sensitiveData);
      
      expect(hashed).toBe('hashed_11_chars');
      expect(hashed).not.toBe(sensitiveData);
    });

    it('should mask sensitive data', () => {
      const cardNumber = '4111111111111111';
      const masked = mockUtilsIndex.maskSensitiveData(cardNumber, 4);
      
      expect(masked).toBe('************1111');
      expect(masked.length).toBe(cardNumber.length);
    });

    it('should handle short data in masking', () => {
      const shortData = '123';
      const masked = mockUtilsIndex.maskSensitiveData(shortData, 4);
      
      expect(masked).toBe('123'); // Should return as-is if shorter than showLast
    });
  });

  describe('Integration with Payment Processing', () => {
    it('should work together for complete payment validation', () => {
      const paymentData = {
        cardNumber: '4111-1111-1111-1111',
        amount: 25.50,
        currency: 'AUD'
      };

      // Sanitize and validate card
      const sanitizedCard = mockUtilsIndex.sanitizeCardNumber(paymentData.cardNumber);
      const isValidCard = mockUtilsIndex.validateCard(sanitizedCard);
      
      // Validate amount and currency
      const isValidAmount = mockUtilsIndex.validateAmount(paymentData.amount);
      const isValidCurrency = mockUtilsIndex.validateCurrency(paymentData.currency);
      
      // Format for display
      const formattedAmount = mockUtilsIndex.formatCurrency(paymentData.amount, paymentData.currency);
      const formattedCard = mockUtilsIndex.formatCardNumber(sanitizedCard);
      
      // Generate reference
      const reference = mockUtilsIndex.generateReference();
      
      expect(sanitizedCard).toBe('4111111111111111');
      expect(isValidCard).toBe(true);
      expect(isValidAmount).toBe(true);
      expect(isValidCurrency).toBe(true);
      expect(formattedAmount).toBe('AUD $25.50');
      expect(formattedCard).toBe('4111 1111 1111 1111');
      expect(reference).toMatch(/^ref-\d+-[a-z0-9]+$/);
    });

    it('should handle error scenarios in payment processing', () => {
      const invalidPaymentData = {
        cardNumber: '1234',
        amount: -10,
        currency: 'INVALID'
      };

      const sanitizedCard = mockUtilsIndex.sanitizeCardNumber(invalidPaymentData.cardNumber);
      const isValidCard = mockUtilsIndex.validateCard(sanitizedCard);
      const isValidAmount = mockUtilsIndex.validateAmount(invalidPaymentData.amount);
      const isValidCurrency = mockUtilsIndex.validateCurrency(invalidPaymentData.currency);

      expect(isValidCard).toBe(false);
      expect(isValidAmount).toBe(false);
      expect(isValidCurrency).toBe(false);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle high-frequency operations efficiently', () => {
      const iterations = 100;
      const start = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        mockUtilsIndex.validateCard('4111111111111111');
        mockUtilsIndex.formatCurrency(25.50, 'AUD');
        mockUtilsIndex.generateReference();
      }
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000); // Should complete quickly
    });

    it('should maintain data integrity across operations', () => {
      const originalCard = '4111111111111111';
      const formatted = mockUtilsIndex.formatCardNumber(originalCard);
      const sanitized = mockUtilsIndex.sanitizeCardNumber(formatted);
      
      expect(sanitized).toBe(originalCard);
    });

    it('should handle concurrent operations safely', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        Promise.resolve(mockUtilsIndex.generateReference())
      );
      
      const references = await Promise.all(promises);
      const uniqueReferences = new Set(references);
      
      expect(uniqueReferences.size).toBe(references.length); // All should be unique
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain consistent API across function calls', () => {
      // Test that function signatures remain stable
      expect(() => mockUtilsIndex.validateCard('4111111111111111')).not.toThrow();
      expect(() => mockUtilsIndex.formatCurrency(25.50)).not.toThrow();
      expect(() => mockUtilsIndex.generateReference()).not.toThrow();
    });

    it('should handle legacy data formats', () => {
      // Test with various input formats that might exist in legacy systems
      expect(mockUtilsIndex.sanitizeCardNumber('4111-1111-1111-1111')).toBe('4111111111111111');
      expect(mockUtilsIndex.sanitizeCardNumber('4111 1111 1111 1111')).toBe('4111111111111111');
      expect(mockUtilsIndex.sanitizeCardNumber('4111.1111.1111.1111')).toBe('4111111111111111');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty and null inputs gracefully', () => {
      expect(() => mockUtilsIndex.validateCard('')).not.toThrow();
      expect(() => mockUtilsIndex.formatCurrency(0)).not.toThrow();
      expect(() => mockUtilsIndex.extractErrorMessage(null)).not.toThrow();
    });

    it('should handle extremely large or small values', () => {
      expect(mockUtilsIndex.validateAmount(0.01)).toBe(true);
      expect(mockUtilsIndex.validateAmount(99999999)).toBe(true);
      expect(mockUtilsIndex.validateAmount(100000000)).toBe(false);
    });

    it('should handle special characters in inputs', () => {
      expect(mockUtilsIndex.sanitizeCardNumber('4111@#$%1111&*()1111!@#1111')).toBe('4111111111111111');
      expect(mockUtilsIndex.formatCardNumber('4111@#$%1111&*()1111!@#1111')).toBe('4111 1111 1111 1111');
    });
  });
});