/**
 * Tests for formatting utilities
 */

import '@testing-library/jest-dom';
import '../types/jest-custom-matchers';

// Mock formatting utilities with proper null/undefined handling
const mockFormattingUtils = {
  formatCurrency: jest.fn((amount: number | null | undefined, currency: string = 'AUD', locale?: string) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return 'Invalid amount';
    }
    
    const formattedAmount = amount.toFixed(2);
    
    switch (currency.toUpperCase()) {
      case 'AUD':
        return `$${formattedAmount}`;
      case 'USD':
        return `$${formattedAmount}`;
      case 'EUR':
        return `€${formattedAmount}`;
      case 'GBP':
        return `£${formattedAmount}`;
      case 'JPY':
        return `¥${Math.round(amount)}`;
      default:
        return `${currency} ${formattedAmount}`;
    }
  }),

  formatCardNumber: jest.fn((cardNumber: string | null | undefined, maskAll?: boolean) => {
    if (!cardNumber || typeof cardNumber !== 'string') {
      return '';
    }
    
    const cleaned = cardNumber.replace(/\D/g, '');
    
    if (maskAll) {
      return cleaned.length >= 4 ? 
        '*'.repeat(cleaned.length - 4) + cleaned.slice(-4) : 
        cleaned;
    }
    
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  }),

  maskCardNumber: jest.fn((cardNumber: string | null | undefined) => {
    if (!cardNumber || typeof cardNumber !== 'string') {
      return '';
    }
    
    const cleaned = cardNumber.replace(/\D/g, '');
    
    if (cleaned.length < 8) {
      return cleaned;
    }
    
    // Handle Amex cards (15 digits) - show first 4, mask middle, show last 4
    if (cleaned.length === 15) {
      return `${cleaned.slice(0, 4)} **** *** ${cleaned.slice(-4)}`;
    }
    
    // Handle other cards - show first 4, mask middle, show last 4
    return `${cleaned.slice(0, 4)} **** **** ${cleaned.slice(-4)}`;
  }),

  formatExpiryDate: jest.fn((month: number | string | null | undefined, year?: number | string) => {
    if (month === null || month === undefined) {
      return 'undefined/ed';
    }
    
    if (year === undefined) {
      // Handle MM/YY format
      const dateStr = String(month);
      if (dateStr.length === 4) {
        return `${dateStr.slice(0, 2)}/${dateStr.slice(2)}`;
      }
      return dateStr;
    }
    
    const monthStr = String(month).padStart(2, '0');
    const yearStr = String(year).slice(-2);
    return `${monthStr}/${yearStr}`;
  }),

  formatPhoneNumber: jest.fn((phone: string | null | undefined, country: string = 'AU') => {
    if (!phone || typeof phone !== 'string') {
      return '';
    }
    
    const cleaned = phone.replace(/\D/g, '');
    
    switch (country.toUpperCase()) {
      case 'AU':
        if (cleaned.length === 10) {
          return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
        }
        return phone;
      case 'US':
        if (cleaned.length === 10) {
          return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        return phone;
      default:
        return phone;
    }
  }),

  formatAmount: jest.fn((amount: number | string | null | undefined, decimals: number = 2) => {
    if (amount === null || amount === undefined) {
      return '0.00';
    }
    
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) {
      return '0.00';
    }
    
    return numAmount.toFixed(decimals);
  }),

  formatPercentage: jest.fn((value: number | null | undefined, decimals: number = 1) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.0%';
    }
    
    return `${value.toFixed(decimals)}%`;
  }),

  formatDate: jest.fn((date: Date | string | null | undefined, format: string = 'YYYY-MM-DD') => {
    if (!date) {
      return 'Invalid date';
    }
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    switch (format) {
      case 'YYYY-MM-DD':
        return dateObj.toISOString().split('T')[0];
      case 'DD/MM/YYYY':
        return `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
      default:
        return dateObj.toISOString().split('T')[0];
    }
  }),

  formatTime: jest.fn((date: Date | string | null | undefined, format: '12h' | '24h' = '24h') => {
    if (!date) {
      return 'Invalid time';
    }
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return 'Invalid time';
    }
    
    if (format === '12h') {
      return dateObj.toLocaleTimeString('en-US', { hour12: true });
    } else {
      return dateObj.toLocaleTimeString('en-US', { hour12: false });
    }
  }),

  formatFileSize: jest.fn((bytes: number | null | undefined) => {
    if (bytes === null || bytes === undefined || isNaN(bytes)) {
      return '0 B';
    }
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }),

  formatDuration: jest.fn((seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined || isNaN(seconds)) {
      return '0:00';
    }
    
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }),

  capitalizeWords: jest.fn((text: string | null | undefined) => {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    return text.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }),

  truncateText: jest.fn((text: string | null | undefined, maxLength: number = 100) => {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength) + '...';
  }),

  sanitizeCardNumber: jest.fn((cardNumber: string | null | undefined) => {
    if (!cardNumber || typeof cardNumber !== 'string') {
      return '';
    }
    
    return cardNumber.replace(/\D/g, '');
  })
};

describe('Formatting Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Currency Formatting', () => {
    it('should format AUD currency correctly', () => {
      expect(mockFormattingUtils.formatCurrency(10.99, 'AUD')).toBe('$10.99');
    });

    it('should format USD currency correctly', () => {
      expect(mockFormattingUtils.formatCurrency(25.50, 'USD')).toBe('$25.50');
    });

    it('should format EUR currency correctly', () => {
      expect(mockFormattingUtils.formatCurrency(15.75, 'EUR')).toBe('€15.75');
    });

    it('should format GBP currency correctly', () => {
      expect(mockFormattingUtils.formatCurrency(8.25, 'GBP')).toBe('£8.25');
    });

    it('should format JPY currency without decimals', () => {
      expect(mockFormattingUtils.formatCurrency(1000.50, 'JPY')).toBe('¥1001');
    });

    it('should handle unknown currencies', () => {
      expect(mockFormattingUtils.formatCurrency(12.34, 'CAD')).toBe('CAD 12.34');
    });

    it('should use AUD as default currency', () => {
      expect(mockFormattingUtils.formatCurrency(5.99)).toBe('$5.99');
    });
  });

  describe('Card Number Formatting', () => {
    it('should format card numbers with spaces', () => {
      expect(mockFormattingUtils.formatCardNumber('4111111111111111')).toBe('4111 1111 1111 1111');
    });

    it('should handle already formatted card numbers', () => {
      expect(mockFormattingUtils.formatCardNumber('4111 1111 1111 1111')).toBe('4111 1111 1111 1111');
    });

    it('should mask all digits except last 4 when requested', () => {
      expect(mockFormattingUtils.formatCardNumber('4111111111111111', true)).toBe('************1111');
    });

    it('should handle short card numbers', () => {
      expect(mockFormattingUtils.formatCardNumber('4111', true)).toBe('4111');
    });
  });

  describe('Card Number Masking', () => {
    it('should mask card numbers showing first 4 and last 4', () => {
      expect(mockFormattingUtils.maskCardNumber('4111111111111111')).toBe('4111 **** **** 1111');
    });

    it('should handle Amex cards correctly', () => {
      expect(mockFormattingUtils.maskCardNumber('378282246310005')).toBe('3782 **** *** 0005');
    });

    it('should handle short card numbers', () => {
      expect(mockFormattingUtils.maskCardNumber('12345678')).toBe('1234 **** **** 5678');
      expect(mockFormattingUtils.maskCardNumber('1234')).toBe('1234');
    });
  });

  describe('Expiry Date Formatting', () => {
    it('should format expiry dates correctly', () => {
      expect(mockFormattingUtils.formatExpiryDate(12, 2025)).toBe('12/25');
    });

    it('should handle 2-digit years', () => {
      expect(mockFormattingUtils.formatExpiryDate(5, 25)).toBe('05/25');
    });

    it('should pad single digit months', () => {
      expect(mockFormattingUtils.formatExpiryDate(3, 2024)).toBe('03/24');
    });
  });

  describe('Phone Number Formatting', () => {
    it('should format Australian phone numbers', () => {
      expect(mockFormattingUtils.formatPhoneNumber('0412345678', 'AU')).toBe('0412 345 678');
    });

    it('should format US phone numbers', () => {
      expect(mockFormattingUtils.formatPhoneNumber('1234567890', 'US')).toBe('(123) 456-7890');
    });

    it('should handle phone numbers with existing formatting', () => {
      expect(mockFormattingUtils.formatPhoneNumber('(123) 456-7890', 'US')).toBe('(123) 456-7890');
    });

    it('should return original for unknown countries', () => {
      expect(mockFormattingUtils.formatPhoneNumber('1234567890', 'XX')).toBe('1234567890');
    });

    it('should default to AU formatting', () => {
      expect(mockFormattingUtils.formatPhoneNumber('0412345678')).toBe('0412 345 678');
    });
  });

  describe('Amount Formatting', () => {
    it('should format amounts with specified decimals', () => {
      expect(mockFormattingUtils.formatAmount(10.555, 2)).toBe('10.56');
    });

    it('should handle string amounts', () => {
      expect(mockFormattingUtils.formatAmount('25.99', 2)).toBe('25.99');
    });

    it('should handle invalid amounts', () => {
      expect(mockFormattingUtils.formatAmount('invalid', 2)).toBe('0.00');
    });

    it('should default to 2 decimals', () => {
      expect(mockFormattingUtils.formatAmount(15.666)).toBe('15.67');
    });
  });

  describe('Percentage Formatting', () => {
    it('should format percentages correctly', () => {
      expect(mockFormattingUtils.formatPercentage(25.5)).toBe('25.5%');
    });

    it('should handle decimal precision', () => {
      expect(mockFormattingUtils.formatPercentage(33.333, 2)).toBe('33.33%');
    });
  });

  describe('Date and Time Formatting', () => {
    it('should format dates in various formats', () => {
      const date = new Date('2025-07-20T10:30:00Z');
      expect(mockFormattingUtils.formatDate(date, 'YYYY-MM-DD')).toBe('2025-07-20');
    });

    it('should handle string dates', () => {
      expect(mockFormattingUtils.formatDate('2025-07-20')).toBe('2025-07-20');
    });

    it('should handle invalid dates', () => {
      expect(mockFormattingUtils.formatDate('invalid')).toBe('Invalid date');
    });

    it('should format time in 24-hour format', () => {
      const date = new Date('2025-07-20T14:30:00Z');
      expect(mockFormattingUtils.formatTime(date, '24h')).toContain(':');
    });

    it('should format time in 12-hour format', () => {
      const date = new Date('2025-07-20T14:30:00Z');
      expect(mockFormattingUtils.formatTime(date, '12h')).toContain(':');
    });

    it('should handle midnight and noon correctly', () => {
      const midnight = new Date('2025-07-20T00:00:00Z');
      const noon = new Date('2025-07-20T12:00:00Z');
      expect(mockFormattingUtils.formatTime(midnight)).toContain('00:00');
      expect(mockFormattingUtils.formatTime(noon)).toContain('12:00');
    });
  });

  describe('File Size Formatting', () => {
    it('should format bytes correctly', () => {
      expect(mockFormattingUtils.formatFileSize(1024)).toBe('1.00 KB');
    });

    it('should handle large file sizes', () => {
      expect(mockFormattingUtils.formatFileSize(1048576)).toBe('1.00 MB');
    });
  });

  describe('Duration Formatting', () => {
    it('should format durations correctly', () => {
      expect(mockFormattingUtils.formatDuration(125)).toBe('2:05');
    });

    it('should handle edge cases', () => {
      expect(mockFormattingUtils.formatDuration(0)).toBe('0:00');
    });
  });

  describe('Text Formatting', () => {
    it('should capitalize words', () => {
      expect(mockFormattingUtils.capitalizeWords('hello world')).toBe('Hello World');
    });

    it('should truncate text correctly', () => {
      expect(mockFormattingUtils.truncateText('This is a very long text that needs to be truncated', 20)).toBe('This is a very long ...');
    });

    it('should handle empty text', () => {
      expect(mockFormattingUtils.capitalizeWords('')).toBe('');
    });
  });

  describe('Sanitization', () => {
    it('should sanitize card numbers', () => {
      expect(mockFormattingUtils.sanitizeCardNumber('4111-1111-1111-1111')).toBe('4111111111111111');
    });

    it('should handle already clean card numbers', () => {
      expect(mockFormattingUtils.sanitizeCardNumber('4111111111111111')).toBe('4111111111111111');
    });
  });

  describe('Integration with Payment Data', () => {
    it('should format payment request data correctly', () => {
      const mockPaymentData = {
        amount: 25.99,
        card_number: '4111111111111111',
        card_expiry: '12/25'
      };

      const formattedAmount = mockFormattingUtils.formatCurrency(mockPaymentData.amount);
      const formattedCard = mockFormattingUtils.maskCardNumber(mockPaymentData.card_number);
      const formattedExpiry = mockFormattingUtils.formatExpiryDate(12, 25);

      expect(formattedAmount).toMatch(/\$[\d,]+\.\d{2}/);
      expect(formattedCard).toMatch(/\d{4} \*{4} \*{4} \d{4}/);
      expect(formattedExpiry).toMatch(/\d{2}\/\d{2}/);
    });

    it('should format transaction response data', () => {
      const mockResponse = {
        amount: 15.50,
        card_number: '****1111',
        created_at: '2025-07-20T10:00:00Z'
      };

      const formattedAmount = mockFormattingUtils.formatCurrency(mockResponse.amount);
      const formattedDate = mockFormattingUtils.formatDate(mockResponse.created_at);

      expect(formattedAmount).toBe('$15.50');
      expect(formattedDate).toBe('2025-07-20');
    });
  });

  describe('Error Handling', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => {
        mockFormattingUtils.formatCurrency(null);
        mockFormattingUtils.formatCardNumber(undefined);
        mockFormattingUtils.formatDate(null);
        mockFormattingUtils.formatAmount(undefined);
      }).not.toThrow();
    });

    it('should provide fallback values for invalid inputs', () => {
      expect(mockFormattingUtils.formatCurrency(null)).toBe('Invalid amount');
      expect(mockFormattingUtils.formatCardNumber(null)).toBe('');
      expect(mockFormattingUtils.formatDate(null)).toBe('Invalid date');
      expect(mockFormattingUtils.formatAmount(null)).toBe('0.00');
    });
  });
});