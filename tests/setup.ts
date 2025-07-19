import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for TextEncoder/TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock fetch globally
global.fetch = jest.fn();

// Mock crypto for Node.js environment
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      importKey: jest.fn(),
      sign: jest.fn(),
    },
    getRandomValues: jest.fn((arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
  },
});

// Mock window object for browser-specific tests
Object.defineProperty(global, 'window', {
  value: {
    crypto: global.crypto,
  },
  writable: true,
});

// Mock btoa/atob for base64 encoding
global.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');

// Helper function to mock fetch responses
export const mockFetchResponse = (data: any, ok: boolean = true, status: number = 200) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
  });
};

// Helper function to mock fetch errors
export const mockFetchError = (error: Error) => {
  (global.fetch as jest.Mock).mockRejectedValueOnce(error);
};

// Helper function to create mock purchase request
export const createMockPurchaseRequest = () => ({
  amount: 10.00,
  currency: 'AUD',
  reference: 'TEST-REF-123',
  card_details: {
    card_holder: 'John Doe',
    card_number: '4005550000000001',
    card_expiry: '12/25',
    cvv: '123'
  },
  customer: {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com'
  }
});

// Helper function to create mock transaction response
export const createMockTransactionResponse = () => ({
  successful: true,
  response: {
    id: 'txn-123456',
    amount: 10.00,
    currency: 'AUD',
    reference: 'TEST-REF-123',
    successful: true,
    message: 'Approved',
    authorization: 'AUTH123456',
    card: {
      token: 'card-token-123',
      display_number: '4005...0001',
      scheme: 'visa',
      expiry_month: 12,
      expiry_year: 2025
    },
    settlement: {
      date: '2024-01-15'
    },
    transaction_fee: 0.30,
    acquirer_response: {
      code: '00',
      message: 'Approved'
    }
  },
  test: true
});

// Helper function to create mock error response
export const createMockErrorResponse = (message: string = 'Test error', errors: string[] = []) => ({
  successful: false,
  errors: errors.length > 0 ? errors : [message],
  message,
  test: true
});

// Mock environment variables
process.env.FATZEBRA_USERNAME = 'test-username';
process.env.FATZEBRA_TOKEN = 'test-token';
process.env.FATZEBRA_SHARED_SECRET = 'test-shared-secret';
process.env.FATZEBRA_CLIENT_ID = 'test-client-id';
process.env.FATZEBRA_CLIENT_SECRET = 'test-client-secret';
process.env.NODE_ENV = 'test';

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  (global.fetch as jest.Mock).mockClear();
});

// Set up default console mocks to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Add custom matchers
expect.extend({
  toBeValidCardNumber(received: string) {
    const digits = received.replace(/\D/g, '');
    const isValid = digits.length >= 13 && digits.length <= 19;
    
    return {
      message: () => `expected ${received} to be a valid card number`,
      pass: isValid,
    };
  },
  
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(received);
    
    return {
      message: () => `expected ${received} to be a valid email`,
      pass: isValid,
    };
  },
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidCardNumber(): R;
      toBeValidEmail(): R;
    }
  }
}