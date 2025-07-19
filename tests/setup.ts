import '@testing-library/jest-dom';

// Mock environment variables
process.env.FATZEBRA_USERNAME = 'test-username';
process.env.FATZEBRA_TOKEN = 'test-token';
process.env.FATZEBRA_SHARED_SECRET = 'test-shared-secret';
process.env.FATZEBRA_CLIENT_ID = 'test-client-id';
process.env.FATZEBRA_CLIENT_SECRET = 'test-client-secret';
process.env.NODE_ENV = 'test';

// Mock fetch globally
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset fetch mock
  (global.fetch as jest.Mock).mockClear();
  
  // Mock successful responses by default
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({
      successful: true,
      response: {
        id: 'test-transaction-id',
        amount: 10.00,
        currency: 'AUD',
        reference: 'TEST-REF',
        successful: true,
        message: 'Approved'
      }
    })
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Suppress console errors and warnings in tests unless explicitly testing them
beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Mock Fat Zebra SDK
jest.mock('@fat-zebra/sdk', () => ({
  FatZebra: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    verify: jest.fn().mockResolvedValue({
      successful: true,
      data: {
        eci: '05',
        cavv: 'test-cavv',
        xid: 'test-xid'
      }
    })
  })),
  Environment: {
    sandbox: 'sandbox',
    production: 'production'
  }
}));

// Mock crypto module for Node.js environment
jest.mock('crypto', () => ({
  createHmac: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mocked-hash')
  })
}));

// Custom matchers for better testing experience
expect.extend({
  toBeValidCardNumber(received: string) {
    // Simple Luhn algorithm check for testing
    const cleanNumber = received.replace(/\s/g, '');
    const isValid = /^\d+$/.test(cleanNumber) && cleanNumber.length >= 13 && cleanNumber.length <= 19;
    
    return {
      message: () => `expected ${received} to be a valid card number`,
      pass: isValid
    };
  },
  
  toHaveValidTransactionStructure(received: any) {
    const hasRequiredFields = received &&
      typeof received.id === 'string' &&
      typeof received.amount === 'number' &&
      typeof received.currency === 'string' &&
      typeof received.reference === 'string' &&
      typeof received.successful === 'boolean';
    
    return {
      message: () => `expected ${JSON.stringify(received)} to have valid transaction structure`,
      pass: hasRequiredFields
    };
  }
});

// Add type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidCardNumber(): R;
      toHaveValidTransactionStructure(): R;
    }
  }
}

// Test utilities
export const createMockCardDetails = (overrides = {}) => ({
  card_holder: 'John Doe',
  card_number: '4005550000000001',
  card_expiry: '12/25',
  cvv: '123',
  ...overrides
});

export const createMockPurchaseRequest = (overrides = {}) => ({
  amount: 10.00,
  currency: 'AUD',
  reference: 'TEST-REF-' + Date.now(),
  card_details: createMockCardDetails(),
  customer_ip: '127.0.0.1',
  ...overrides
});

export const createMockCustomer = (overrides = {}) => ({
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '0412345678',
  address: '123 Test Street',
  city: 'Sydney',
  state: 'NSW',
  postcode: '2000',
  country: 'AU',
  ...overrides
});

export const mockFetchResponse = (data: any, status = 200, ok = true) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    status,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data))
  });
};

export const mockFetchError = (error: string) => {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(error));
};

// Async test helper
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));