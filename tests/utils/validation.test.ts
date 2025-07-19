import {
  validateCard,
  detectCardType,
  formatCardNumber,
  formatCardExpiry,
  validateAmount,
  isValidEmail,
  isExpired
} from '../../src/utils';
import { CARD_TYPES, TEST_CARDS } from '../../src/types';

describe('Card Validation', () => {
  describe('validateCard', () => {
    it('should validate Visa cards correctly', () => {
      const result = validateCard(TEST_CARDS.VISA_SUCCESS);
      expect(result.isValid).toBe(true);
      expect(result.cardType).toBe(CARD_TYPES.VISA);
      expect(result.errors).toHaveLength(0);
    });

    it('should invalidate incorrect card numbers', () => {
      const result = validateCard('1234567890123456');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty card numbers', () => {
      const result = validateCard('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Card number must be between 13 and 19 digits');
    });
  });

  describe('detectCardType', () => {
    it('should detect Visa cards', () => {
      expect(detectCardType('4111111111111111')).toBe(CARD_TYPES.VISA);
      expect(detectCardType(TEST_CARDS.VISA_SUCCESS)).toBe(CARD_TYPES.VISA);
    });

    it('should detect MasterCard', () => {
      expect(detectCardType(TEST_CARDS.MASTERCARD_SUCCESS)).toBe(CARD_TYPES.MASTERCARD);
    });

    it('should detect American Express', () => {
      expect(detectCardType(TEST_CARDS.AMEX_SUCCESS)).toBe(CARD_TYPES.AMEX);
    });

    it('should return unknown for invalid cards', () => {
      expect(detectCardType('1234567890')).toBe(CARD_TYPES.UNKNOWN);
    });
  });

  describe('formatCardNumber', () => {
    it('should format Visa cards with spaces', () => {
      expect(formatCardNumber('4111111111111111')).toBe('4111 1111 1111 1111');
    });

    it('should format AMEX cards correctly', () => {
      expect(formatCardNumber('345678901234564')).toBe('3456 789012 34564');
    });

    it('should handle partial numbers', () => {
      expect(formatCardNumber('4111')).toBe('4111');
      expect(formatCardNumber('41111111')).toBe('4111 1111');
    });
  });

  describe('formatCardExpiry', () => {
    it('should format expiry dates', () => {
      expect(formatCardExpiry('1225')).toBe('12/25');
      expect(formatCardExpiry('12')).toBe('12');
      expect(formatCardExpiry('')).toBe('');
    });

    it('should handle invalid input', () => {
      expect(formatCardExpiry('abc')).toBe('');
      expect(formatCardExpiry('12/25')).toBe('12/25');
    });
  });
});

describe('Amount Validation', () => {
  it('should validate positive amounts', () => {
    expect(validateAmount(10.50, 'AUD')).toBe(true);
    expect(validateAmount(0.50, 'AUD')).toBe(true);
  });

  it('should reject negative amounts', () => {
    expect(validateAmount(-1, 'AUD')).toBe(false);
    expect(validateAmount(0, 'AUD')).toBe(false);
  });

  it('should respect minimum amounts by currency', () => {
    expect(validateAmount(0.20, 'AUD')).toBe(false); // Below minimum
    expect(validateAmount(50, 'JPY')).toBe(true); // At minimum
    expect(validateAmount(30, 'JPY')).toBe(false); // Below minimum
  });
});

describe('Email Validation', () => {
  it('should validate correct email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
  });
});

describe('Date Validation', () => {
  it('should detect expired cards', () => {
    expect(isExpired('01', '20')).toBe(true); // January 2020
    expect(isExpired('12', '30')).toBe(false); // December 2030
  });

  it('should handle current month/year correctly', () => {
    const now = new Date();
    const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const currentYear = (now.getFullYear() % 100).toString().padStart(2, '0');
    
    expect(isExpired(currentMonth, currentYear)).toBe(false);
  });
});