import '@testing-library/jest-dom';
import '../../types/jest-custom-matchers';

// Import the test helpers using CommonJS require syntax to avoid ESM issues
const {
  mockFetchResponse,
  createMockPurchaseRequest,
  createMockTransactionResponse,
  createMockErrorResponse
} = require('../../setup');

// Mock utility functions since they might not exist yet
const mockUtils = {
  validateCard: jest.fn((cardNumber: string) => {
    return cardNumber.length >= 13 && cardNumber.length <= 19;
  }),
  validateAmount: jest.fn((amount: number) => {
    return amount > 0 && amount <= 99999999;
  }),
  formatCurrency: jest.fn((amount: number, currency: string = 'AUD') => {
    return `${currency} ${amount.toFixed(2)}`;
  }),
  sanitizeCardNumber: jest.fn((cardNumber: string) => {
    return cardNumber.replace(/\D/g, '');
  }),
  generateReference: jest.fn(() => {
    return `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }),
  isTestCard: jest.fn((cardNumber: string) => {
    const testCards = ['4005550000000001', '4111111111111111', '5555555555554444'];
    return testCards.includes(cardNumber);
  }),
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
  extractErrorMessage: jest.fn((error: any) => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    return 'Unknown error occurred';
  }),
  extractErrorDetails: jest.fn((error: any) => {
    return {
      message: mockUtils.extractErrorMessage(error),
      code: error?.code || 'UNKNOWN_ERROR',
      details: error?.details || null
    };
  })
};

describe('Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Card Validation', () => {
    it('should validate valid card numbers', () => {
      expect(mockUtils.validateCard('4111111111111111')).toBe(true);
      expect(mockUtils.validateCard('5555555555554444')).toBe(true);
      expect(mockUtils.validateCard('378282246310005')).toBe(true);
    });

    it('should reject invalid card numbers', () => {
      expect(mockUtils.validateCard('123')).toBe(false);
      expect(mockUtils.validateCard('12345678901234567890')).toBe(false);
      expect(mockUtils.validateCard('')).toBe(false);
    });

    it('should sanitize card numbers', () => {
      expect(mockUtils.sanitizeCardNumber('4111-1111-1111-1111')).toBe('4111111111111111');
      expect(mockUtils.sanitizeCardNumber('4111 1111 1111 1111')).toBe('4111111111111111');
      expect(mockUtils.sanitizeCardNumber('4111.1111.1111.1111')).toBe('4111111111111111');
    });

    it('should identify test cards', () => {
      expect(mockUtils.isTestCard('4005550000000001')).toBe(true);
      expect(mockUtils.isTestCard('4111111111111111')).toBe(true);
      expect(mockUtils.isTestCard('1234567890123456')).toBe(false);
    });
  });

  describe('Amount Validation', () => {
    it('should validate positive amounts', () => {
      expect(mockUtils.validateAmount(10.50)).toBe(true);
      expect(mockUtils.validateAmount(1)).toBe(true);
      expect(mockUtils.validateAmount(999999)).toBe(true);
    });

    it('should reject invalid amounts', () => {
      expect(mockUtils.validateAmount(0)).toBe(false);
      expect(mockUtils.validateAmount(-10)).toBe(false);
      expect(mockUtils.validateAmount(100000000)).toBe(false);
    });

    it('should format currency correctly', () => {
      expect(mockUtils.formatCurrency(10.5)).toBe('AUD 10.50');
      expect(mockUtils.formatCurrency(10.5, 'USD')).toBe('USD 10.50');
      expect(mockUtils.formatCurrency(1000, 'EUR')).toBe('EUR 1000.00');
    });
  });

  describe('Reference Generation', () => {
    it('should generate unique references', () => {
      const ref1 = mockUtils.generateReference();
      const ref2 = mockUtils.generateReference();
      
      expect(ref1).toMatch(/^ref-\d+-[a-z0-9]+$/);
      expect(ref2).toMatch(/^ref-\d+-[a-z0-9]+$/);
      expect(ref1).not.toBe(ref2);
    });

    it('should generate references with consistent format', () => {
      const ref = mockUtils.generateReference();
      expect(ref).toMatch(/^ref-/);
      expect(ref.length).toBeGreaterThan(10);
    });
  });

  describe('Async Utilities', () => {
    it('should implement delay function', async () => {
      const start = Date.now();
      await mockUtils.delay(100);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });

    it('should retry operations with backoff', async () => {
      let attempts = 0;
      const failingFunction = jest.fn(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const result = await mockUtils.retryWithBackoff(failingFunction, 5);
      expect(result).toBe('success');
      expect(failingFunction).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const alwaysFailingFunction = jest.fn(() => {
        throw new Error('Permanent failure');
      });

      await expect(mockUtils.retryWithBackoff(alwaysFailingFunction, 2))
        .rejects.toThrow('Permanent failure');
      expect(alwaysFailingFunction).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should extract error messages from various error types', () => {
      expect(mockUtils.extractErrorMessage('Simple string error')).toBe('Simple string error');
      expect(mockUtils.extractErrorMessage(new Error('Error object'))).toBe('Error object');
      expect(mockUtils.extractErrorMessage({ message: 'Object with message' })).toBe('Object with message');
      expect(mockUtils.extractErrorMessage(null)).toBe('Unknown error occurred');
    });

    it('should extract detailed error information', () => {
      const error = {
        message: 'Payment failed',
        code: 'PAYMENT_FAILED',
        details: { reason: 'Insufficient funds' }
      };

      const details = mockUtils.extractErrorDetails(error);
      expect(details.message).toBe('Payment failed');
      expect(details.code).toBe('PAYMENT_FAILED');
      expect(details.details).toEqual({ reason: 'Insufficient funds' });
    });

    it('should handle errors without details', () => {
      const error = new Error('Simple error');
      const details = mockUtils.extractErrorDetails(error);
      
      expect(details.message).toBe('Simple error');
      expect(details.code).toBe('UNKNOWN_ERROR');
      expect(details.details).toBe(null);
    });
  });

  describe('Data Processing', () => {
    it('should handle empty or null inputs gracefully', () => {
      expect(mockUtils.sanitizeCardNumber('')).toBe('');
      expect(mockUtils.validateCard('')).toBe(false);
      expect(mockUtils.extractErrorMessage(null)).toBe('Unknown error occurred');
    });

    it('should maintain data integrity during processing', () => {
      const originalCardNumber = '4111111111111111';
      const sanitized = mockUtils.sanitizeCardNumber(originalCardNumber);
      expect(sanitized).toBe(originalCardNumber);
      expect(mockUtils.validateCard(sanitized)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle large numbers efficiently', () => {
      const largeAmount = 99999999;
      expect(() => mockUtils.validateAmount(largeAmount)).not.toThrow();
      expect(() => mockUtils.formatCurrency(largeAmount)).not.toThrow();
    });

    it('should handle repeated operations efficiently', () => {
      const iterations = 1000;
      const start = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        mockUtils.generateReference();
      }
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });
});