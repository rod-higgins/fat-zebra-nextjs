/**
 * Test Setup Configuration - Enhanced for Fat Zebra v0.4.8
 * 
 * This setup file configures the testing environment while preserving all
 * existing functionality and adding improvements for test stability.
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

// Global fetch mock
global.fetch = jest.fn();

// Mock localStorage and sessionStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock
});

// Mock window.location
delete (window as any).location;
window.location = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  reload: jest.fn(),
  replace: jest.fn(),
  toString: () => 'http://localhost:3000'
} as any;

// Enhanced console method mocking to reduce test noise
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
       args[0].includes('Warning: An invalid form control') ||
       args[0].includes('Warning: An update to') && args[0].includes('was not wrapped in act'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: An update to') && args[0].includes('was not wrapped in act'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Enhanced test helper functions
export const mockFetchResponse = (data: any, status = 200): Promise<Response> => {
  return Promise.resolve({
    ok: status < 400,
    status,
    statusText: status < 400 ? 'OK' : 'Error',
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    clone: () => mockFetchResponse(data, status).then(r => r),
    // Add missing Response properties
    redirected: false,
    type: 'basic' as ResponseType,
    url: 'http://localhost:3000/test',
    body: null,
    bodyUsed: false,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
    bytes: () => Promise.resolve(new Uint8Array()),
  } as unknown as Response);
};

export const mockFetchError = (error: Error): Promise<never> => {
  return Promise.reject(error);
};

export const createMockPurchaseRequest = () => ({
  amount: 2500, // 25.00 in cents
  currency: 'AUD',
  reference: 'TEST-REF-123',
  card_holder: 'John Doe',
  card_number: '4111111111111111',
  card_expiry: '12/25',
  cvv: '123',
  customer_ip: '127.0.0.1'
});

export const createMockTransactionResponse = (overrides = {}) => ({
  successful: true,
  response: {
    id: 'txn-123',
    amount: 2500,
    currency: 'AUD',
    reference: 'TEST-REF-123',
    message: 'Approved',
    successful: true,
    settlement_date: '2024-01-15',
    transaction_id: 'txn-123',
    card_holder: 'John Doe',
    card_number: '************1111',
    card_type: 'visa',
    authorization: 'AUTH123',
    captured: true,
    created_at: '2024-01-15T10:30:00Z',
    ...overrides
  },
  errors: []
});

export const createMockTokenizationResponse = () => ({
  successful: true,
  response: {
    token: 'card-token-123',
    card_holder: 'John Doe',
    card_number: '************1111',
    card_type: 'visa',
    expiry_date: '12/25',
    created_at: '2024-01-15T10:30:00Z'
  },
  errors: []
});

export const createMockErrorResponse = (errors: string[] = ['Transaction failed']) => ({
  successful: false,
  errors,
  test: true
});

export const createMockAuthorizationRequest = () => ({
  amount: 2500,
  currency: 'AUD',
  reference: 'AUTH-REF-123',
  card_holder: 'John Doe',
  card_number: '4111111111111111',
  card_expiry: '12/25',
  cvv: '123',
  capture: false
});

export const createMockRefundRequest = () => ({
  transaction_id: 'txn-123',
  amount: 2500,
  reference: 'REFUND-REF-123',
  reason: 'Customer request'
});

export const createMockTokenizationRequest = () => ({
  card_holder: 'John Doe',
  card_number: '4111111111111111',
  card_expiry: '12/25',
  cvv: '123'
});

// Additional mock helpers for comprehensive testing
export const createMockSubscriptionRequest = () => ({
  amount: 2500,
  currency: 'AUD',
  reference: 'SUB-REF-123',
  card_holder: 'John Doe',
  card_number: '4111111111111111',
  card_expiry: '12/25',
  cvv: '123',
  frequency: 'Monthly',
  start_date: '2024-02-01'
});

export const createMockWebhookEvent = () => ({
  event: 'transaction.successful',
  data: {
    id: 'txn-123',
    amount: 2500,
    currency: 'AUD',
    successful: true
  },
  timestamp: '2024-01-15T10:30:00Z'
});

// Mock environment variables for tests
process.env.FATZEBRA_USERNAME = 'test-username';
process.env.FATZEBRA_TOKEN = 'test-token';
process.env.FATZEBRA_SHARED_SECRET = 'test-secret';
process.env.FATZEBRA_CLIENT_ID = 'test-client-id';
process.env.FATZEBRA_CLIENT_SECRET = 'test-client-secret';
process.env.NODE_ENV = 'test';

// Mock ResizeObserver for jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver for jsdom
global.IntersectionObserver = class IntersectionObserver {
  root: Element | Document | null = null;
  rootMargin: string = '0px';
  thresholds: ReadonlyArray<number> = [0];

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.root = options?.root || null;
    this.rootMargin = options?.rootMargin || '0px';
    this.thresholds = options?.threshold ? 
      (Array.isArray(options.threshold) ? options.threshold : [options.threshold]) : 
      [0];
  }

  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
} as any;

// Mock matchMedia for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scroll behavior
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true
});

// Mock crypto for Node.js environment
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },
    subtle: {
      generateKey: jest.fn(),
      importKey: jest.fn(),
      exportKey: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      sign: jest.fn(),
      verify: jest.fn(),
    }
  }
});

// Enhanced cleanup after each test
afterEach(() => {
  // Cleanup React testing utilities
  cleanup();
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clear fetch mock specifically
  (fetch as jest.Mock).mockClear();
  
  // Reset local storage mock
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidPaymentResponse(): R;
      toBeValidTokenResponse(): R;
      toHaveValidErrorStructure(): R;
      toMatchFatZebraErrorFormat(): R;
    }
  }
}

// Test utilities for better error handling
export const expectNoConsoleErrors = () => {
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  
  return {
    restore: () => {
      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    }
  };
};

export const expectNoConsoleWarnings = () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  
  return {
    restore: () => {
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    }
  };
};

export const waitForAsync = (ms: number = 0) => 
  new Promise(resolve => setTimeout(resolve, ms));

// Export mock functions for CommonJS compatibility
module.exports = {
  mockFetchResponse,
  mockFetchError,
  createMockPurchaseRequest,
  createMockTransactionResponse,
  createMockTokenizationResponse,
  createMockErrorResponse,
  createMockAuthorizationRequest,
  createMockRefundRequest,
  createMockTokenizationRequest,
  createMockSubscriptionRequest,
  createMockWebhookEvent,
  expectNoConsoleErrors,
  expectNoConsoleWarnings,
  waitForAsync
};

// Custom test timeout for async operations
jest.setTimeout(10000);

console.log('🧪 Test environment setup complete - Fat Zebra v0.4.8');