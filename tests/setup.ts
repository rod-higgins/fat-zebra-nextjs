import '@testing-library/jest-dom';

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

// Mock console methods to reduce test noise
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is deprecated') ||
       args[0].includes('Warning: An invalid form control'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Test helper functions
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

// Custom matchers are defined in tests/types/jest-custom-matchers.ts

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  (fetch as jest.Mock).mockClear();
});

// Export mock functions for CommonJS compatibility
module.exports = {
  mockFetchResponse,
  createMockPurchaseRequest,
  createMockTransactionResponse,
  createMockTokenizationResponse,
  createMockErrorResponse,
  createMockAuthorizationRequest,
  createMockRefundRequest,
  createMockTokenizationRequest
};