import '@testing-library/jest-dom';
import '../types/jest-custom-matchers';

// Import the test helpers using CommonJS require syntax to avoid ESM issues
const {
  mockFetchResponse,
  createMockPurchaseRequest,
  createMockTransactionResponse,
  createMockErrorResponse
} = require('../setup');

// Import validation functions from the actual source files
import {
  luhnCheck,
  detectCardType,
  validateCard,
  formatCardNumber,
  formatExpiryDate,
  formatCvv,
  validateExpiryDate,
  validateCvv,
  validateEmail,
  validatePhone,
  maskCardNumber,
  generateReference
} from '../../src/utils/validation';

// Import utility functions that might have different implementations
import {
  validateCard as validateCardIndex,
  getCardType,
  formatCardNumber as formatCardIndex,
  validateAmount
} from '../../src/utils';

import { TEST_CARDS } from '../../src/types';
import type { CardValidationResult } from '../../src/types';

describe('Card Validation Functions', () => {
  describe('luhnCheck', () => {
    it('should validate test card numbers', () => {
      expect(luhnCheck(TEST_CARDS.VISA_SUCCESS)).toBe(true);
      expect(luhnCheck(TEST_CARDS.MASTERCARD_SUCCESS)).toBe(true);
      expect(luhnCheck(TEST_CARDS.AMEX_SUCCESS)).toBe(true);
    });

    it('should reject invalid numbers', () => {
      expect(luhnCheck('1234567890123456')).toBe(false);
      expect(luhnCheck('4111111111111112')).toBe(false);
    });

    it('should handle formatted card numbers', () => {
      expect(luhnCheck('4005 5500 0000 0001')).toBe(true);
      expect(luhnCheck('4005-5500-0000-0001')).toBe(true);
    });

    it('should handle invalid input gracefully', () => {
      expect(luhnCheck('')).toBe(false);
      expect(luhnCheck('abc')).toBe(false);
      expect(luhnCheck('123abc456')).toBe(false);
    });
  });

  describe('detectCardType', () => {
    it('should detect Visa cards', () => {
      expect(detectCardType('4005550000000001')).toBe('Visa');
      expect(detectCardType('4111111111111111')).toBe('Visa');
      expect(detectCardType('4')).toBe('Visa');
    });

    it('should detect MasterCard', () => {
      expect(detectCardType('5123456789012346')).toBe('Mastercard');
      expect(detectCardType('5555555555554444')).toBe('Mastercard');
      expect(detectCardType('2223000048400011')).toBe('Mastercard'); // New range
    });

    it('should detect American Express', () => {
      expect(detectCardType('345678901234564')).toBe('American Express');
      expect(detectCardType('378282246310005')).toBe('American Express');
    });

    it('should detect Discover', () => {
      expect(detectCardType('6011111111111117')).toBe('Discover');
      expect(detectCardType('6510000000000000')).toBe('Discover');
    });

    it('should detect Diners Club', () => {
      expect(detectCardType('30569309025904')).toBe('Diners Club');
      expect(detectCardType('38520000023237')).toBe('Diners Club');
    });

    it('should detect JCB', () => {
      expect(detectCardType('3530111333300000')).toBe('JCB');
      expect(detectCardType('3566002020360505')).toBe('JCB');
    });

    it('should return Unknown for unrecognized cards', () => {
      expect(detectCardType('1234567890123456')).toBe('Unknown');
      expect(detectCardType('9999999999999999')).toBe('Unknown');
      expect(detectCardType('')).toBe('Unknown');
    });
  });

  describe('validateCard', () => {
    it('should validate correct card numbers', () => {
      const result = validateCard(TEST_CARDS.VISA_SUCCESS);
      expect(result.valid).toBe(true);
      expect(result.type).toBe('Visa');
      expect(result.errors).toHaveLength(0);
    });

    it('should invalidate incorrect card numbers', () => {
      const result = validateCard('1234567890123456');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Invalid card number');
    });

    it('should validate card length for different types', () => {
      // Test Visa with wrong length
      const shortVisa = validateCard('411111'); // Too short
      expect(shortVisa.valid).toBe(false);
      expect(shortVisa.errors).toContain('Card number must be between 13 and 19 digits');

      // Test Amex with wrong length  
      const wrongAmex = validateCard('3456789012345641'); // 16 digits instead of 15
      expect(wrongAmex.valid).toBe(false);
      expect(wrongAmex.errors).toContain('American Express cards must be 15 digits');
    });

    it('should handle empty card numbers', () => {
      const result = validateCard('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Card number is required');
    });

    it('should validate MasterCard correctly', () => {
      const result = validateCard(TEST_CARDS.MASTERCARD_SUCCESS);
      expect(result.valid).toBe(true);
      expect(result.type).toBe('Mastercard');
    });

    it('should validate American Express correctly', () => {
      const result = validateCard(TEST_CARDS.AMEX_SUCCESS);
      expect(result.valid).toBe(true);
      expect(result.type).toBe('American Express');
    });
  });
});

describe('Card Formatting Functions', () => {
  describe('formatCardNumber', () => {
    it('should format Visa cards with 4-4-4-4 pattern', () => {
      expect(formatCardNumber('4111111111111111')).toBe('4111 1111 1111 1111');
      expect(formatCardNumber('4005550000000001')).toBe('4005 5500 0000 0001');
    });

    it('should format American Express with 4-6-5 pattern', () => {
      expect(formatCardNumber('345678901234564')).toBe('3456 789012 34564');
      expect(formatCardNumber('378282246310005')).toBe('3782 822463 10005');
    });

    it('should format MasterCard with 4-4-4-4 pattern', () => {
      expect(formatCardNumber('5555555555554444')).toBe('5555 5555 5555 4444');
      expect(formatCardNumber('5123456789012346')).toBe('5123 4567 8901 2346');
    });

    it('should handle partial numbers', () => {
      expect(formatCardNumber('4111')).toBe('4111');
      expect(formatCardNumber('41111111')).toBe('4111 1111');
      expect(formatCardNumber('411111111111')).toBe('4111 1111 1111');
    });

    it('should handle already formatted numbers', () => {
      expect(formatCardNumber('4111 1111 1111 1111')).toBe('4111 1111 1111 1111');
      expect(formatCardNumber('3456 789012 34564')).toBe('3456 789012 34564');
    });

    it('should remove non-numeric characters', () => {
      expect(formatCardNumber('4111-1111-1111-1111')).toBe('4111 1111 1111 1111');
      expect(formatCardNumber('4111.1111.1111.1111')).toBe('4111 1111 1111 1111');
      expect(formatCardNumber('4111abc1111def1111ghi1111')).toBe('4111 1111 1111 1111');
    });

    it('should handle empty input', () => {
      expect(formatCardNumber('')).toBe('');
      expect(formatCardNumber('   ')).toBe('');
    });
  });

  describe('formatExpiryDate', () => {
    it('should format MM/YY correctly', () => {
      expect(formatExpiryDate('1225')).toBe('12/25');
      expect(formatExpiryDate('0125')).toBe('01/25');
      expect(formatExpiryDate('1299')).toBe('12/99');
    });

    it('should handle month validation', () => {
      expect(formatExpiryDate('1325')).toBe('12/25'); // Invalid month corrected
      expect(formatExpiryDate('0025')).toBe('12/25'); // Invalid month corrected
    });

    it('should handle partial input', () => {
      expect(formatExpiryDate('1')).toBe('1');
      expect(formatExpiryDate('12')).toBe('12');
      expect(formatExpiryDate('123')).toBe('12/3');
    });

    it('should handle non-numeric characters', () => {
      expect(formatExpiryDate('12a25')).toBe('12/25');
      expect(formatExpiryDate('1/2/25')).toBe('12/25');
      expect(formatExpiryDate('12-25')).toBe('12/25');
    });

    it('should handle empty input', () => {
      expect(formatExpiryDate('')).toBe('');
      expect(formatExpiryDate('abc')).toBe('');
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
      expect(formatCvv('abc123def')).toBe('123');
    });

    it('should limit to 4 digits maximum', () => {
      expect(formatCvv('12345')).toBe('1234');
      expect(formatCvv('123456789')).toBe('1234');
    });

    it('should handle empty input', () => {
      expect(formatCvv('')).toBe('');
      expect(formatCvv('abc')).toBe('');
    });
  });
});

describe('Date and CVV Validation', () => {
  describe('validateExpiryDate', () => {
    it('should validate future dates', () => {
      const futureYear = (new Date().getFullYear() + 1) % 100;
      const futureDate = `12/${futureYear.toString().padStart(2, '0')}`;
      
      const result = validateExpiryDate(futureDate);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid format', () => {
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
      
      const result13 = validateExpiryDate(`13/${yearStr}`);
      expect(result13.valid).toBe(false);
      expect(result13.error).toBe('Invalid month');

      const result00 = validateExpiryDate(`00/${yearStr}`);
      expect(result00.valid).toBe(false);
      expect(result00.error).toBe('Invalid month');
    });

    it('should handle current month/year edge case', () => {
      const now = new Date();
      const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
      const currentYear = (now.getFullYear() % 100).toString().padStart(2, '0');
      
      const result = validateExpiryDate(`${currentMonth}/${currentYear}`);
      // Should be valid for current month
      expect(result.valid).toBe(true);
    });
  });

  describe('validateCvv', () => {
    it('should validate 3-digit CVV for regular cards', () => {
      const result = validateCvv('123');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate 4-digit CVV for American Express', () => {
      const result = validateCvv('1234', 'American Express');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject wrong length for card type', () => {
      const result3ForAmex = validateCvv('123', 'American Express');
      expect(result3ForAmex.valid).toBe(false);
      expect(result3ForAmex.error).toContain('CVV must be 4 digits for American Express');

      const result4ForVisa = validateCvv('1234', 'Visa');
      expect(result4ForVisa.valid).toBe(false);
      expect(result4ForVisa.error).toContain('CVV must be 3 digits for Visa');
    });

    it('should reject non-numeric CVV', () => {
      const result = validateCvv('abc');
      expect(result.valid).toBe(false);
    });

    it('should reject empty CVV', () => {
      const result = validateCvv('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('CVV is required');
    });

    it('should handle CVV with non-numeric characters', () => {
      const result = validateCvv('12a');
      expect(result.valid).toBe(false);
    });
  });
});

describe('Email and Phone Validation', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const emails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@example.com',
        'email@123.123.123.123', // IP address
        'user@[IPv6:2001:db8::1]' // IPv6
      ];

      emails.forEach(email => {
        const result = validateEmail(email);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test@.com',
        'test.example.com',
        'test@@example.com',
        'test@exam ple.com',
        ''
      ];

      invalidEmails.forEach(email => {
        const result = validateEmail(email);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should require email when provided', () => {
      const result = validateEmail('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Email is required');
    });
  });

  describe('validatePhone', () => {
    it('should validate correct phone numbers', () => {
      const phones = [
        '+61412345678',
        '0412345678',
        '(02) 1234 5678',
        '+1-555-123-4567',
        '1234567890'
      ];

      phones.forEach(phone => {
        const result = validatePhone(phone);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should allow empty phone numbers (optional)', () => {
      expect(validatePhone('').valid).toBe(true);
      expect(validatePhone('   ').valid).toBe(true);
    });

    it('should reject too short phone numbers', () => {
      const shortPhones = ['123', '123456', '12345'];

      shortPhones.forEach(phone => {
        const result = validatePhone(phone);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Phone number must be at least 10 digits');
      });
    });
  });
});

describe('Utility Functions', () => {
  describe('maskCardNumber', () => {
    it('should mask card numbers correctly', () => {
      expect(maskCardNumber('4005550000000001')).toContain('0001');
      expect(maskCardNumber('4005550000000001')).toContain('*');
      expect(maskCardNumber('4005550000000001')).toMatch(/\*+ 0001$/);
    });

    it('should handle short card numbers', () => {
      expect(maskCardNumber('123')).toBe('****');
      expect(maskCardNumber('')).toBe('****');
    });

    it('should format masked numbers', () => {
      const masked = maskCardNumber('4005550000000001');
      expect(masked).toContain(' '); // Should have spaces
    });
  });

  describe('generateReference', () => {
    it('should generate unique references', () => {
      const ref1 = generateReference();
      const ref2 = generateReference();
      
      expect(ref1).not.toBe(ref2);
      expect(ref1).toMatch(/^ORDER-\d+-[A-Z0-9]+$/);
    });

    it('should use custom prefix', () => {
      const ref = generateReference('TEST');
      expect(ref).toMatch(/^TEST-\d+-[A-Z0-9]+$/);
    });

    it('should generate references with default prefix', () => {
      const ref = generateReference();
      expect(ref).toMatch(/^ORDER-\d+-[A-Z0-9]+$/);
    });
  });

  describe('validateAmount', () => {
    it('should validate positive numbers', () => {
      expect(validateAmount(10.50)).toBe(true);
      expect(validateAmount(1)).toBe(true);
      expect(validateAmount(0.01)).toBe(true);
      expect(validateAmount(1000000)).toBe(true);
    });

    it('should reject invalid amounts', () => {
      expect(validateAmount(0)).toBe(false);
      expect(validateAmount(-10)).toBe(false);
      expect(validateAmount(NaN)).toBe(false);
      expect(validateAmount(Infinity)).toBe(false);
      expect(validateAmount(-Infinity)).toBe(false);
    });
  });
});

describe('Cross-Implementation Compatibility', () => {
  it('should have consistent results between implementations', () => {
    const testCard = TEST_CARDS.VISA_SUCCESS;
    
    // Both implementations should give similar results
    const result1 = validateCard(testCard);
    const result2 = validateCardIndex({
      card_holder: 'Test User',
      card_number: testCard,
      card_expiry: '12/25',
      cvv: '123'
    });

    expect(result1.valid).toBe(true);
    expect(result2.valid).toBe(true);
  });

  it('should format cards consistently', () => {
    const testCard = '4005550000000001';
    
    const formatted1 = formatCardNumber(testCard);
    const formatted2 = formatCardIndex(testCard);
    
    expect(formatted1).toBe(formatted2);
    expect(formatted1).toBe('4005 5500 0000 0001');
  });

  it('should detect card types consistently', () => {
    const testCard = TEST_CARDS.VISA_SUCCESS;
    
    const type1 = detectCardType(testCard);
    const type2 = getCardType(testCard);
    
    expect(type1).toBe('Visa');
    expect(type2).toBe('visa'); // Different casing but same meaning
  });
});

describe('Edge Cases and Error Handling', () => {
  it('should handle malformed input gracefully', () => {
    const malformedInputs = [null, undefined, {}, [], 123];
    
    malformedInputs.forEach(input => {
      expect(() => {
        // These should not throw errors
        formatCardNumber(String(input || ''));
        formatExpiryDate(String(input || ''));
        formatCvv(String(input || ''));
      }).not.toThrow();
    });
  });

  it('should handle unicode and special characters', () => {
    const specialInputs = ['🎃', '测试', '👍', '💳'];
    
    specialInputs.forEach(input => {
      expect(() => {
        formatCardNumber(input);
        formatExpiryDate(input);
        formatCvv(input);
        validateEmail(input);
      }).not.toThrow();
    });
  });

  it('should handle very long inputs', () => {
    const longInput = '1'.repeat(1000);
    
    expect(() => {
      formatCardNumber(longInput);
      formatExpiryDate(longInput);
      formatCvv(longInput);
    }).not.toThrow();
    
    // CVV should be limited to 4 characters
    expect(formatCvv(longInput)).toBe('1111');
  });
});

describe('Performance and Type Safety', () => {
  it('should maintain type safety', () => {
    // These should compile without TypeScript errors
    const card: string = '4005550000000001';
    const isValid: boolean = luhnCheck(card);
    const cardType: string = detectCardType(card);
    const validationResult: CardValidationResult = validateCard(card);
    
    expect(typeof isValid).toBe('boolean');
    expect(typeof cardType).toBe('string');
    expect(typeof validationResult.valid).toBe('boolean');
    expect(Array.isArray(validationResult.errors)).toBe(true);
  });

  it('should handle multiple validations efficiently', () => {
    const cards = [
      TEST_CARDS.VISA_SUCCESS,
      TEST_CARDS.MASTERCARD_SUCCESS,
      TEST_CARDS.AMEX_SUCCESS,
      TEST_CARDS.VISA_DECLINE,
      TEST_CARDS.MASTERCARD_DECLINE,
      TEST_CARDS.AMEX_DECLINE
    ];

    // This should complete quickly
    const start = Date.now();
    cards.forEach(card => {
      validateCard(card);
      formatCardNumber(card);
      detectCardType(card);
      luhnCheck(card);
    });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100); // Should be very fast
  });
});