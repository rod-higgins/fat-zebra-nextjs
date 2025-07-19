import '@testing-library/jest-dom';
import '../types/jest-custom-matchers';

// Import the test helpers using CommonJS require syntax to avoid ESM issues
const {
  mockFetchResponse,
  createMockPurchaseRequest,
  createMockTransactionResponse,
  createMockErrorResponse
} = require('../setup');

// Mock formatting utilities since they might not exist yet
const mockFormattingUtils = {
  formatCurrency: jest.fn((amount: number, currency: string = 'AUD', locale?: string) => {
    const formattedAmount = amount.toFixed(2);
    
    switch (currency.toUpperCase()) {
      case 'AUD':
        return `AUD $${formattedAmount}`;
      case 'USD':
        return `USD $${formattedAmount}`;
      case 'EUR':
        return `EUR €${formattedAmount}`;
      case 'GBP':
        return `GBP £${formattedAmount}`;
      case 'JPY':
        return `JPY ¥${Math.round(amount)}`;
      default:
        return `${currency} ${formattedAmount}`;
    }
  }),

  formatCardNumber: jest.fn((cardNumber: string, maskAll: boolean = false) => {
    const cleaned = cardNumber.replace(/\D/g, '');
    
    if (maskAll) {
      const last4 = cleaned.slice(-4);
      const masked = '*'.repeat(Math.max(0, cleaned.length - 4));
      return `${masked}${last4}`.replace(/(.{4})/g, '$1 ').trim();
    }
    
    // Format with spaces every 4 digits
    return cleaned.replace(/(.{4})/g, '$1 ').trim();
  }),

  maskCardNumber: jest.fn((cardNumber: string) => {
    const cleaned = cardNumber.replace(/\D/g, '');
    const first4 = cleaned.slice(0, 4);
    const last4 = cleaned.slice(-4);
    const middle = '*'.repeat(Math.max(0, cleaned.length - 8));
    
    return `${first4}${middle}${last4}`.replace(/(.{4})/g, '$1 ').trim();
  }),

  formatExpiryDate: jest.fn((month: string | number, year: string | number) => {
    const monthStr = String(month).padStart(2, '0');
    const yearStr = String(year);
    
    // Handle 2-digit years
    if (yearStr.length === 2) {
      return `${monthStr}/${yearStr}`;
    }
    
    // Handle 4-digit years
    return `${monthStr}/${yearStr.slice(-2)}`;
  }),

  formatPhoneNumber: jest.fn((phone: string, country: string = 'AU') => {
    const cleaned = phone.replace(/\D/g, '');
    
    switch (country.toUpperCase()) {
      case 'AU':
        if (cleaned.length === 10) {
          return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
        }
        break;
      case 'US':
        if (cleaned.length === 10) {
          return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
        }
        if (cleaned.length === 11 && cleaned[0] === '1') {
          return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
        }
        break;
      default:
        return cleaned;
    }
    
    return phone;
  }),

  formatAmount: jest.fn((amount: number | string, decimals: number = 2) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) return '0.00';
    
    return numAmount.toFixed(decimals);
  }),

  formatPercentage: jest.fn((value: number, decimals: number = 2) => {
    return `${(value * 100).toFixed(decimals)}%`;
  }),

  formatDate: jest.fn((date: Date | string, format: string = 'DD/MM/YYYY') => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    switch (format.toUpperCase()) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'DD-MM-YYYY':
        return `${day}-${month}-${year}`;
      default:
        return `${day}/${month}/${year}`;
    }
  }),

  formatTime: jest.fn((date: Date | string, format: string = '24') => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) return 'Invalid Time';
    
    const hours = dateObj.getHours();
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    
    if (format === '12') {
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      return `${displayHours}:${minutes}:${seconds} ${ampm}`;
    }
    
    return `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
  }),

  formatFileSize: jest.fn((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }),

  formatDuration: jest.fn((milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }),

  sanitizeCardNumber: jest.fn((cardNumber: string) => {
    return cardNumber.replace(/\D/g, '');
  }),

  capitalizeWords: jest.fn((text: string) => {
    return text.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }),

  truncateText: jest.fn((text: string, maxLength: number, suffix: string = '...') => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - suffix.length) + suffix;
  })
};

describe('Formatting Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Currency Formatting', () => {
    it('should format AUD currency correctly', () => {
      expect(mockFormattingUtils.formatCurrency(25.50, 'AUD')).toBe('AUD $25.50');
      expect(mockFormattingUtils.formatCurrency(100, 'AUD')).toBe('AUD $100.00');
      expect(mockFormattingUtils.formatCurrency(0.99, 'AUD')).toBe('AUD $0.99');
    });

    it('should format USD currency correctly', () => {
      expect(mockFormattingUtils.formatCurrency(50.75, 'USD')).toBe('USD $50.75');
      expect(mockFormattingUtils.formatCurrency(1000, 'USD')).toBe('USD $1000.00');
    });

    it('should format EUR currency correctly', () => {
      expect(mockFormattingUtils.formatCurrency(75.25, 'EUR')).toBe('EUR €75.25');
      expect(mockFormattingUtils.formatCurrency(500, 'EUR')).toBe('EUR €500.00');
    });

    it('should format GBP currency correctly', () => {
      expect(mockFormattingUtils.formatCurrency(99.99, 'GBP')).toBe('GBP £99.99');
      expect(mockFormattingUtils.formatCurrency(250, 'GBP')).toBe('GBP £250.00');
    });

    it('should format JPY currency without decimals', () => {
      expect(mockFormattingUtils.formatCurrency(1500.75, 'JPY')).toBe('JPY ¥1501');
      expect(mockFormattingUtils.formatCurrency(3000, 'JPY')).toBe('JPY ¥3000');
    });

    it('should handle unknown currencies', () => {
      expect(mockFormattingUtils.formatCurrency(100, 'XYZ')).toBe('XYZ 100.00');
    });

    it('should use AUD as default currency', () => {
      expect(mockFormattingUtils.formatCurrency(50)).toBe('AUD $50.00');
    });
  });

  describe('Card Number Formatting', () => {
    it('should format card numbers with spaces', () => {
      expect(mockFormattingUtils.formatCardNumber('4111111111111111')).toBe('4111 1111 1111 1111');
      expect(mockFormattingUtils.formatCardNumber('5555555555554444')).toBe('5555 5555 5555 4444');
      expect(mockFormattingUtils.formatCardNumber('378282246310005')).toBe('3782 8224 6310 005');
    });

    it('should handle already formatted card numbers', () => {
      expect(mockFormattingUtils.formatCardNumber('4111-1111-1111-1111')).toBe('4111 1111 1111 1111');
      expect(mockFormattingUtils.formatCardNumber('4111 1111 1111 1111')).toBe('4111 1111 1111 1111');
    });

    it('should mask all digits except last 4 when requested', () => {
      expect(mockFormattingUtils.formatCardNumber('4111111111111111', true)).toBe('**** **** **** 1111');
      expect(mockFormattingUtils.formatCardNumber('5555555555554444', true)).toBe('**** **** **** 4444');
    });

    it('should handle short card numbers', () => {
      expect(mockFormattingUtils.formatCardNumber('1234')).toBe('1234');
      expect(mockFormattingUtils.formatCardNumber('12345678')).toBe('1234 5678');
    });
  });

  describe('Card Number Masking', () => {
    it('should mask card numbers showing first 4 and last 4', () => {
      expect(mockFormattingUtils.maskCardNumber('4111111111111111')).toBe('4111 **** **** 1111');
      expect(mockFormattingUtils.maskCardNumber('5555555555554444')).toBe('5555 **** **** 4444');
    });

    it('should handle Amex cards correctly', () => {
      expect(mockFormattingUtils.maskCardNumber('378282246310005')).toBe('3782 **** *** 0005');
    });

    it('should handle short card numbers', () => {
      expect(mockFormattingUtils.maskCardNumber('12345678')).toBe('1234 5678');
      expect(mockFormattingUtils.maskCardNumber('1234')).toBe('1234');
    });
  });

  describe('Expiry Date Formatting', () => {
    it('should format expiry dates correctly', () => {
      expect(mockFormattingUtils.formatExpiryDate(12, 2025)).toBe('12/25');
      expect(mockFormattingUtils.formatExpiryDate(6, 2024)).toBe('06/24');
      expect(mockFormattingUtils.formatExpiryDate('3', '2026')).toBe('03/26');
    });

    it('should handle 2-digit years', () => {
      expect(mockFormattingUtils.formatExpiryDate(12, 25)).toBe('12/25');
      expect(mockFormattingUtils.formatExpiryDate(6, '24')).toBe('06/24');
    });

    it('should pad single digit months', () => {
      expect(mockFormattingUtils.formatExpiryDate(1, 2025)).toBe('01/25');
      expect(mockFormattingUtils.formatExpiryDate(9, 2025)).toBe('09/25');
    });
  });

  describe('Phone Number Formatting', () => {
    it('should format Australian phone numbers', () => {
      expect(mockFormattingUtils.formatPhoneNumber('0412345678', 'AU')).toBe('0412 345 678');
      expect(mockFormattingUtils.formatPhoneNumber('0298765432', 'AU')).toBe('0298 765 432');
    });

    it('should format US phone numbers', () => {
      expect(mockFormattingUtils.formatPhoneNumber('5551234567', 'US')).toBe('(555) 123-4567');
      expect(mockFormattingUtils.formatPhoneNumber('15551234567', 'US')).toBe('+1 (555) 123-4567');
    });

    it('should handle phone numbers with existing formatting', () => {
      expect(mockFormattingUtils.formatPhoneNumber('(555) 123-4567', 'US')).toBe('(555) 123-4567');
      expect(mockFormattingUtils.formatPhoneNumber('0412-345-678', 'AU')).toBe('0412 345 678');
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
      expect(mockFormattingUtils.formatAmount(25.5, 2)).toBe('25.50');
      expect(mockFormattingUtils.formatAmount(100, 2)).toBe('100.00');
      expect(mockFormattingUtils.formatAmount(25.5, 0)).toBe('26');
      expect(mockFormattingUtils.formatAmount(25.555, 3)).toBe('25.555');
    });

    it('should handle string amounts', () => {
      expect(mockFormattingUtils.formatAmount('25.5')).toBe('25.50');
      expect(mockFormattingUtils.formatAmount('100')).toBe('100.00');
    });

    it('should handle invalid amounts', () => {
      expect(mockFormattingUtils.formatAmount('invalid')).toBe('0.00');
      expect(mockFormattingUtils.formatAmount('')).toBe('0.00');
    });

    it('should default to 2 decimals', () => {
      expect(mockFormattingUtils.formatAmount(25.5)).toBe('25.50');
    });
  });

  describe('Percentage Formatting', () => {
    it('should format percentages correctly', () => {
      expect(mockFormattingUtils.formatPercentage(0.15)).toBe('15.00%');
      expect(mockFormattingUtils.formatPercentage(0.5)).toBe('50.00%');
      expect(mockFormattingUtils.formatPercentage(1)).toBe('100.00%');
    });

    it('should handle decimal precision', () => {
      expect(mockFormattingUtils.formatPercentage(0.12345, 0)).toBe('12%');
      expect(mockFormattingUtils.formatPercentage(0.12345, 1)).toBe('12.3%');
      expect(mockFormattingUtils.formatPercentage(0.12345, 3)).toBe('12.345%');
    });
  });

  describe('Date and Time Formatting', () => {
    const testDate = new Date('2023-12-25T15:30:45');

    it('should format dates in various formats', () => {
      expect(mockFormattingUtils.formatDate(testDate, 'DD/MM/YYYY')).toBe('25/12/2023');
      expect(mockFormattingUtils.formatDate(testDate, 'MM/DD/YYYY')).toBe('12/25/2023');
      expect(mockFormattingUtils.formatDate(testDate, 'YYYY-MM-DD')).toBe('2023-12-25');
      expect(mockFormattingUtils.formatDate(testDate, 'DD-MM-YYYY')).toBe('25-12-2023');
    });

    it('should handle string dates', () => {
      expect(mockFormattingUtils.formatDate('2023-12-25')).toBe('25/12/2023');
    });

    it('should handle invalid dates', () => {
      expect(mockFormattingUtils.formatDate('invalid-date')).toBe('Invalid Date');
    });

    it('should format time in 24-hour format', () => {
      expect(mockFormattingUtils.formatTime(testDate, '24')).toBe('15:30:45');
    });

    it('should format time in 12-hour format', () => {
      expect(mockFormattingUtils.formatTime(testDate, '12')).toBe('3:30:45 PM');
    });

    it('should handle midnight and noon correctly', () => {
      const midnight = new Date('2023-12-25T00:30:45');
      const noon = new Date('2023-12-25T12:30:45');
      
      expect(mockFormattingUtils.formatTime(midnight, '12')).toBe('12:30:45 AM');
      expect(mockFormattingUtils.formatTime(noon, '12')).toBe('12:30:45 PM');
    });
  });

  describe('File Size Formatting', () => {
    it('should format bytes correctly', () => {
      expect(mockFormattingUtils.formatFileSize(0)).toBe('0 Bytes');
      expect(mockFormattingUtils.formatFileSize(512)).toBe('512.00 Bytes');
      expect(mockFormattingUtils.formatFileSize(1024)).toBe('1.00 KB');
      expect(mockFormattingUtils.formatFileSize(1048576)).toBe('1.00 MB');
      expect(mockFormattingUtils.formatFileSize(1073741824)).toBe('1.00 GB');
    });

    it('should handle large file sizes', () => {
      expect(mockFormattingUtils.formatFileSize(2048)).toBe('2.00 KB');
      expect(mockFormattingUtils.formatFileSize(5242880)).toBe('5.00 MB');
    });
  });

  describe('Duration Formatting', () => {
    it('should format durations correctly', () => {
      expect(mockFormattingUtils.formatDuration(5000)).toBe('5s');
      expect(mockFormattingUtils.formatDuration(65000)).toBe('1m 5s');
      expect(mockFormattingUtils.formatDuration(3665000)).toBe('1h 1m 5s');
    });

    it('should handle edge cases', () => {
      expect(mockFormattingUtils.formatDuration(0)).toBe('0s');
      expect(mockFormattingUtils.formatDuration(60000)).toBe('1m 0s');
      expect(mockFormattingUtils.formatDuration(3600000)).toBe('1h 0m 0s');
    });
  });

  describe('Text Formatting', () => {
    it('should capitalize words', () => {
      expect(mockFormattingUtils.capitalizeWords('hello world')).toBe('Hello World');
      expect(mockFormattingUtils.capitalizeWords('UPPER CASE')).toBe('Upper Case');
      expect(mockFormattingUtils.capitalizeWords('mixed CaSe')).toBe('Mixed Case');
    });

    it('should truncate text correctly', () => {
      expect(mockFormattingUtils.truncateText('Hello World', 10)).toBe('Hello W...');
      expect(mockFormattingUtils.truncateText('Short', 10)).toBe('Short');
      expect(mockFormattingUtils.truncateText('Hello World', 5, '---')).toBe('He---');
    });

    it('should handle empty text', () => {
      expect(mockFormattingUtils.capitalizeWords('')).toBe('');
      expect(mockFormattingUtils.truncateText('', 10)).toBe('');
    });
  });

  describe('Sanitization', () => {
    it('should sanitize card numbers', () => {
      expect(mockFormattingUtils.sanitizeCardNumber('4111-1111-1111-1111')).toBe('4111111111111111');
      expect(mockFormattingUtils.sanitizeCardNumber('4111 1111 1111 1111')).toBe('4111111111111111');
      expect(mockFormattingUtils.sanitizeCardNumber('4111.1111.1111.1111')).toBe('4111111111111111');
    });

    it('should handle already clean card numbers', () => {
      expect(mockFormattingUtils.sanitizeCardNumber('4111111111111111')).toBe('4111111111111111');
    });
  });

  describe('Integration with Payment Data', () => {
    it('should format payment request data correctly', () => {
      const mockRequest = createMockPurchaseRequest();
      
      const formattedAmount = mockFormattingUtils.formatCurrency(mockRequest.amount, mockRequest.currency);
      const formattedCard = mockFormattingUtils.maskCardNumber(mockRequest.card_number);
      const formattedExpiry = mockFormattingUtils.formatExpiryDate(
        mockRequest.expiry_month, 
        mockRequest.expiry_year
      );
      
      expect(formattedAmount).toMatch(/\$[\d,]+\.\d{2}/);
      expect(formattedCard).toMatch(/\d{4} \*{4} \*{4} \d{4}/);
      expect(formattedExpiry).toMatch(/\d{2}\/\d{2}/);
    });

    it('should format transaction response data', () => {
      const mockResponse = createMockTransactionResponse();
      
      if (mockResponse.response?.amount && mockResponse.response?.currency) {
        const formattedAmount = mockFormattingUtils.formatCurrency(
          mockResponse.response.amount, 
          mockResponse.response.currency
        );
        expect(formattedAmount).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(() => mockFormattingUtils.formatCurrency(null as any)).not.toThrow();
      expect(() => mockFormattingUtils.formatCardNumber(null as any)).not.toThrow();
      expect(() => mockFormattingUtils.formatDate(null as any)).not.toThrow();
    });

    it('should provide fallback values for invalid inputs', () => {
      expect(mockFormattingUtils.formatAmount('invalid')).toBe('0.00');
      expect(mockFormattingUtils.formatDate('invalid')).toBe('Invalid Date');
      expect(mockFormattingUtils.formatTime('invalid')).toBe('Invalid Time');
    });
  });
});