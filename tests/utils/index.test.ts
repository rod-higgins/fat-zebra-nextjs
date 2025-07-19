import {
  getCardType,
  isValidCardNumber,
  validateCard,
  formatCardNumber,
  formatExpiryDate,
  isValidExpiryDate,
  isValidCVV,
  formatCurrency,
  generateReference,
  maskCardNumber,
  isValidEmail,
  isValidPhone,
  formatPhone,
  isValidPostcode,
  convertCurrency,
  calculateTransactionFee,
  isValidBSB,
  formatBSB,
  isValidAccountNumber,
  sanitizeInput,
  sanitizeCardData,
  formatErrorMessage,
  retryAsync,
  isTestMode,
  getApiBaseUrl,
  TEST_CARDS
} from '../../src/utils';

describe('Card Utilities', () => {
  describe('getCardType', () => {
    it('should detect Visa cards', () => {
      expect(getCardType('4005550000000001')).toBe('Visa');
      expect(getCardType('4111 1111 1111 1111')).toBe('Visa');
    });

    it('should detect Mastercard', () => {
      expect(getCardType('5123456789012346')).toBe('Mastercard');
      expect(getCardType('5555 5555 5555 4444')).toBe('Mastercard');
    });

    it('should detect American Express', () => {
      expect(getCardType('345678901234564')).toBe('Amex');
      expect(getCardType('3782 822463 10005')).toBe('Amex');
    });

    it('should return Unknown for invalid cards', () => {
      expect(getCardType('1234567890123456')).toBe('Unknown');
      expect(getCardType('invalid')).toBe('Unknown');
    });
  });

  describe('isValidCardNumber', () => {
    it('should validate correct card numbers', () => {
      expect(isValidCardNumber('4005550000000001')).toBe(true);
      expect(isValidCardNumber('5123456789012346')).toBe(true);
    });

    it('should reject invalid card numbers', () => {
      expect(isValidCardNumber('4005550000000002')).toBe(false); // Wrong checksum
      expect(isValidCardNumber('invalid')).toBe(false);
      expect(isValidCardNumber('')).toBe(false);
    });

    it('should handle card numbers with spaces', () => {
      expect(isValidCardNumber('4005 5500 0000 0001')).toBe(true);
    });
  });

  describe('validateCard', () => {
    it('should validate complete card details', () => {
      const result = validateCard('4005550000000001');
      expect(result.isValid).toBe(true);
      expect(result.cardType).toBe('Visa');
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid cards', () => {
      const result = validateCard('4005550000000002');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate Amex length', () => {
      const result = validateCard('345678901234564');
      expect(result.isValid).toBe(true);
      expect(result.cardType).toBe('Amex');
    });

    it('should reject empty card number', () => {
      const result = validateCard('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Card number is required');
    });
  });

  describe('formatCardNumber', () => {
    it('should format Visa card numbers', () => {
      expect(formatCardNumber('4005550000000001')).toBe('4005 5500 0000 0001');
    });

    it('should format Amex card numbers', () => {
      expect(formatCardNumber('345678901234564')).toBe('3456 789012 34564');
    });

    it('should handle partial numbers', () => {
      expect(formatCardNumber('4005')).toBe('4005');
      expect(formatCardNumber('40055500')).toBe('4005 5500');
    });
  });
});

describe('Date and CVV Utilities', () => {
  describe('formatExpiryDate', () => {
    it('should format expiry dates', () => {
      expect(formatExpiryDate('1225')).toBe('12/25');
      expect(formatExpiryDate('12')).toBe('12/');
      expect(formatExpiryDate('1')).toBe('1');
    });

    it('should handle non-numeric input', () => {
      expect(formatExpiryDate('12a25')).toBe('12/25');
      expect(formatExpiryDate('ab12cd25ef')).toBe('12/25');
    });
  });

  describe('isValidExpiryDate', () => {
    it('should validate correct formats', () => {
      // Create a future date
      const futureYear = (new Date().getFullYear() + 1) % 100;
      const futureDate = `12/${futureYear.toString().padStart(2, '0')}`;
      expect(isValidExpiryDate(futureDate)).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidExpiryDate('1225')).toBe(false);
      expect(isValidExpiryDate('12/2025')).toBe(false);
      expect(isValidExpiryDate('invalid')).toBe(false);
    });

    it('should reject expired dates', () => {
      expect(isValidExpiryDate('01/20')).toBe(false); // Assuming current year > 2020
    });

    it('should reject invalid months', () => {
      const futureYear = (new Date().getFullYear() + 1) % 100;
      expect(isValidExpiryDate(`13/${futureYear.toString().padStart(2, '0')}`)).toBe(false);
      expect(isValidExpiryDate(`00/${futureYear.toString().padStart(2, '0')}`)).toBe(false);
    });
  });

  describe('isValidCVV', () => {
    it('should validate 3-digit CVV for most cards', () => {
      expect(isValidCVV('123')).toBe(true);
      expect(isValidCVV('456', 'Visa')).toBe(true);
    });

    it('should validate 4-digit CVV for Amex', () => {
      expect(isValidCVV('1234', 'Amex')).toBe(true);
      expect(isValidCVV('123', 'Amex')).toBe(false);
    });

    it('should reject non-numeric CVV', () => {
      expect(isValidCVV('abc')).toBe(false);
      expect(isValidCVV('12a')).toBe(false);
    });
  });
});

describe('Currency and Reference Utilities', () => {
  describe('formatCurrency', () => {
    it('should format AUD currency', () => {
      expect(formatCurrency(10.50, 'AUD')).toMatch(/\$10\.50/);
    });

    it('should handle different amounts', () => {
      expect(formatCurrency(0.50, 'AUD')).toMatch(/\$0\.50/);
      expect(formatCurrency(1000, 'AUD')).toMatch(/\$1,000\.00/);
    });
  });

  describe('generateReference', () => {
    it('should generate unique references', () => {
      const ref1 = generateReference();
      const ref2 = generateReference();
      expect(ref1).not.toBe(ref2);
      expect(ref1).toMatch(/^PAY-\d+-[A-Z0-9]+$/);
    });

    it('should use custom prefix', () => {
      const ref = generateReference('ORDER');
      expect(ref).toMatch(/^ORDER-\d+-[A-Z0-9]+$/);
    });
  });

  describe('maskCardNumber', () => {
    it('should mask card numbers correctly', () => {
      expect(maskCardNumber('4005550000000001')).toBe('**** **** **** 0001');
      expect(maskCardNumber('4005 5500 0000 0001')).toBe('**** **** **** 0001');
    });

    it('should handle short numbers', () => {
      expect(maskCardNumber('123')).toBe('***');
    });
  });
});

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should validate Australian mobile numbers', () => {
      expect(isValidPhone('0412345678')).toBe(true);
      expect(isValidPhone('+61412345678')).toBe(true);
    });

    it('should validate Australian landline numbers', () => {
      expect(isValidPhone('0212345678')).toBe(true);
      expect(isValidPhone('0387654321')).toBe(true);
    });

    it('should reject invalid numbers', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('01234567890')).toBe(false);
    });
  });

  describe('formatPhone', () => {
    it('should format mobile numbers', () => {
      expect(formatPhone('0412345678')).toBe('0412 345 678');
    });

    it('should format landline numbers', () => {
      expect(formatPhone('0212345678')).toBe('(02) 1234 5678');
    });

    it('should return original for invalid format', () => {
      expect(formatPhone('123')).toBe('123');
    });
  });

  describe('isValidPostcode', () => {
    it('should validate Australian postcodes', () => {
      expect(isValidPostcode('2000')).toBe(true);
      expect(isValidPostcode('3000')).toBe(true);
    });

    it('should reject invalid postcodes', () => {
      expect(isValidPostcode('200')).toBe(false);
      expect(isValidPostcode('20000')).toBe(false);
      expect(isValidPostcode('abcd')).toBe(false);
    });
  });
});

describe('Financial Utilities', () => {
  describe('convertCurrency', () => {
    it('should convert between currencies', () => {
      expect(convertCurrency(100, 'AUD', 'USD', 0.75)).toBe(75);
      expect(convertCurrency(100, 'USD', 'AUD', 1.33)).toBe(133);
    });

    it('should return same amount for same currency', () => {
      expect(convertCurrency(100, 'AUD', 'AUD', 1.0)).toBe(100);
    });
  });

  describe('calculateTransactionFee', () => {
    it('should calculate default fees', () => {
      const fee = calculateTransactionFee(100);
      expect(fee).toBe(3.20); // 2.9% + $0.30
    });

    it('should calculate custom fees', () => {
      const fee = calculateTransactionFee(100, 1.5, 0.25);
      expect(fee).toBe(1.75); // 1.5% + $0.25
    });
  });
});

describe('Banking Utilities', () => {
  describe('isValidBSB', () => {
    it('should validate BSB numbers', () => {
      expect(isValidBSB('123456')).toBe(true);
      expect(isValidBSB('123-456')).toBe(true);
    });

    it('should reject invalid BSB', () => {
      expect(isValidBSB('12345')).toBe(false);
      expect(isValidBSB('abcdef')).toBe(false);
    });
  });

  describe('formatBSB', () => {
    it('should format BSB numbers', () => {
      expect(formatBSB('123456')).toBe('123-456');
      expect(formatBSB('123')).toBe('123-');
    });
  });

  describe('isValidAccountNumber', () => {
    it('should validate account numbers', () => {
      expect(isValidAccountNumber('12345678')).toBe(true);
      expect(isValidAccountNumber('1234')).toBe(true);
      expect(isValidAccountNumber('1234567890')).toBe(true);
    });

    it('should reject invalid account numbers', () => {
      expect(isValidAccountNumber('123')).toBe(false);
      expect(isValidAccountNumber('12345678901')).toBe(false);
      expect(isValidAccountNumber('abcd1234')).toBe(false);
    });
  });
});

describe('Data Sanitization', () => {
  describe('sanitizeInput', () => {
    it('should trim whitespace and remove dangerous characters', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
      expect(sanitizeInput('test<script>')).toBe('testscript');
      expect(sanitizeInput('test>alert')).toBe('testalert');
    });
  });

  describe('sanitizeCardData', () => {
    it('should sanitize card data properly', () => {
      const input = {
        card_holder: '  John Doe  ',
        card_number: '4005 5500 0000 0001',
        card_expiry: '12/25',
        cvv: '123'
      };

      const result = sanitizeCardData(input);

      expect(result.card_holder).toBe('John Doe');
      expect(result.card_number).toBe('4005550000000001');
      expect(result.card_expiry).toBe('1225');
      expect(result.cvv).toBe('123');
    });
  });
});

describe('Error Handling', () => {
  describe('formatErrorMessage', () => {
    it('should format string errors', () => {
      expect(formatErrorMessage('Test error')).toBe('Test error');
    });

    it('should format Error objects', () => {
      const error = new Error('Test error');
      expect(formatErrorMessage(error)).toBe('Test error');
    });

    it('should format objects with message property', () => {
      const error = { message: 'Test error' };
      expect(formatErrorMessage(error)).toBe('Test error');
    });

    it('should format arrays', () => {
      expect(formatErrorMessage(['First error', 'Second error'])).toBe('First error');
    });

    it('should handle unknown error types', () => {
      expect(formatErrorMessage(null)).toBe('An unexpected error occurred');
      expect(formatErrorMessage({})).toBe('An unexpected error occurred');
    });
  });

  describe('retryAsync', () => {
    it('should retry failed async operations', async () => {
      let attempts = 0;
      const mockFn = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return 'success';
      });

      const result = await retryAsync(mockFn, 3, 10);
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max retries', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Always fails'));

      await expect(retryAsync(mockFn, 2, 10)).rejects.toThrow('Always fails');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should succeed on first try', async () => {
      const mockFn = jest.fn().mockResolvedValue('immediate success');

      const result = await retryAsync(mockFn, 3, 10);
      expect(result).toBe('immediate success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Environment Utilities', () => {
  describe('isTestMode', () => {
    it('should detect test mode', () => {
      const originalEnv = process.env.NODE_ENV;
      
      process.env.NODE_ENV = 'test';
      expect(isTestMode()).toBe(true);
      
      process.env.NODE_ENV = 'development';
      expect(isTestMode()).toBe(true);
      
      process.env.NODE_ENV = 'production';
      expect(isTestMode()).toBe(false);
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('getApiBaseUrl', () => {
    it('should return correct URLs based on environment', () => {
      const originalEnv = process.env.NODE_ENV;
      
      process.env.NODE_ENV = 'development';
      expect(getApiBaseUrl()).toBe('https://gateway.pmnts-sandbox.io');
      
      process.env.NODE_ENV = 'production';
      expect(getApiBaseUrl()).toBe('https://gateway.pmnts.io');
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});

describe('Test Cards', () => {
  describe('TEST_CARDS', () => {
    it('should provide valid test card numbers', () => {
      expect(TEST_CARDS.VISA_SUCCESS).toBeValidCardNumber();
      expect(TEST_CARDS.MASTERCARD_SUCCESS).toBeValidCardNumber();
      expect(TEST_CARDS.AMEX_SUCCESS).toBeValidCardNumber();
    });

    it('should have all required test cards', () => {
      expect(TEST_CARDS.VISA_SUCCESS).toBeDefined();
      expect(TEST_CARDS.VISA_3DS_SUCCESS).toBeDefined();
      expect(TEST_CARDS.VISA_DECLINE).toBeDefined();
      expect(TEST_CARDS.MASTERCARD_SUCCESS).toBeDefined();
      expect(TEST_CARDS.MASTERCARD_3DS_SUCCESS).toBeDefined();
      expect(TEST_CARDS.MASTERCARD_DECLINE).toBeDefined();
      expect(TEST_CARDS.AMEX_SUCCESS).toBeDefined();
      expect(TEST_CARDS.AMEX_DECLINE).toBeDefined();
    });
  });
});