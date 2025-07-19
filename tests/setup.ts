// tests/setup.ts - Test setup for Jest - CommonJS syntax to avoid ESM/CommonJS conflicts

// Set up global polyfills for Node.js environment only if they don't exist
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder } = require('util');
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  const { TextDecoder } = require('util');
  global.TextDecoder = TextDecoder;
}

// Helper function to create proper Response mock
const createMockResponse = (data: any, ok: boolean = true, status: number = 200): Response => {
  const response = {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    body: null,
    bodyUsed: false,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data)),
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
    blob: jest.fn().mockResolvedValue(new Blob()),
    formData: jest.fn().mockResolvedValue(new FormData()),
    clone: jest.fn(),
    bytes: jest.fn().mockResolvedValue(new Uint8Array())
  };

  // Set up clone to return a copy of the response after it's created
  response.clone = jest.fn().mockReturnValue({ ...response });

  return response as unknown as Response;
};

// Mock fetch for testing with proper Response interface implementation
global.fetch = jest.fn(() => Promise.resolve(createMockResponse({})));

// Mock Response constructor
Object.defineProperty(global, 'Response', {
  value: function MockResponse(body?: BodyInit | null, init?: ResponseInit) {
    return createMockResponse(
      typeof body === 'string' ? JSON.parse(body) : body,
      (init?.status || 200) < 400,
      init?.status || 200
    );
  },
  writable: true
});

// Helper function to mock fetch responses
const mockFetchResponse = (data: any, ok: boolean = true, status: number = 200) => {
  return Promise.resolve(createMockResponse(data, ok, status));
};

const mockFetchError = (error: Error) => {
  return Promise.reject(error);
};

const createMockPurchaseRequest = () => ({
  amount: 2500, // $25.00 in cents
  currency: 'AUD',
  card_number: '4005550000000001',
  card_expiry: '12/25',
  cvv: '123',
  card_holder: 'John Doe',
  reference: 'TEST-' + Date.now(),
  customer_ip: '127.0.0.1',
  customer: {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+61400000000'
  }
});

const createMockTransactionResponse = () => ({
  successful: true,
  response: {
    id: 'txn_' + Date.now(),
    amount: 2500,
    currency: 'AUD',
    reference: 'TEST-' + Date.now(),
    message: 'Approved',
    successful: true,
    settlement_date: new Date().toISOString().split('T')[0],
    transaction_id: 'txn_' + Date.now(),
    card_holder: 'John Doe',
    card_number: '4005***********0001',
    card_type: 'Visa',
    authorization: '123456',
    captured: true,
    created_at: new Date().toISOString()
  },
  errors: [],
  test: true
});

const createMockErrorResponse = (message: string = 'Test error', errors: string[] = []) => ({
  successful: false,
  response: null,
  errors: [message, ...errors],
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

// Export helper functions using CommonJS syntax
module.exports = {
  mockFetchResponse,
  mockFetchError,
  createMockPurchaseRequest,
  createMockTransactionResponse,
  createMockErrorResponse
};