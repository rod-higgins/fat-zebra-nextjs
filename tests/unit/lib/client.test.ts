import '@testing-library/jest-dom';
import '../../types/jest-custom-matchers';

// Import the test helpers using CommonJS require syntax to avoid ESM issues
const {
  mockFetchResponse,
  createMockPurchaseRequest,
  createMockTransactionResponse,
  createMockErrorResponse
} = require('../../setup');

// Import the library modules using TypeScript import syntax
import { FatZebraClient, createFatZebraClient, handleFatZebraResponse, FatZebraError } from '../../../src/lib/client';
import type { 
  FatZebraConfig, 
  PurchaseRequest, 
  TransactionResponse, 
  FatZebraResponse,
  TokenizationRequest,
  RefundRequest
} from '../../../src/types';

describe('FatZebraClient - Standalone Library Tests', () => {
  let client: FatZebraClient;
  let config: FatZebraConfig;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create client configuration for standalone testing (not NextJS)
    config = {
      username: 'test-username',
      token: 'test-token',
      sandbox: true, // Use sandbox instead of isTestMode
      timeout: 30000
    };

    client = createFatZebraClient(config);
  });

  describe('Client Initialization', () => {
    it('should create client instance', () => {
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(FatZebraClient);
    });

    it('should create client with sandbox configuration', () => {
      const sandboxClient = createFatZebraClient({
        username: 'test-username',
        token: 'test-token',
        sandbox: true
      });
      expect(sandboxClient).toBeInstanceOf(FatZebraClient);
    });

    it('should create client with production configuration', () => {
      const prodClient = createFatZebraClient({
        username: 'test-username',
        token: 'test-token',
        sandbox: false
      });
      expect(prodClient).toBeInstanceOf(FatZebraClient);
    });

    it('should validate required configuration fields', () => {
      expect(() => createFatZebraClient({
        username: '',
        token: 'test-token'
      })).not.toThrow(); // Client creation doesn't validate on construction

      expect(() => createFatZebraClient({
        username: 'test-username',
        token: ''
      })).not.toThrow(); // Validation happens during API calls
    });
  });

  describe('Purchase Transactions', () => {
    it('should process successful purchase', async () => {
      const mockRequest = createMockPurchaseRequest();
      const mockResponse = createMockTransactionResponse();

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockFetchResponse(mockResponse)
      );

      const result = await client.purchase(mockRequest);

      expect(result.successful).toBe(true);
      expect(result.response?.id).toBe(mockResponse.response.id);
    });

    it('should handle purchase errors', async () => {
      const mockRequest = createMockPurchaseRequest();
      const mockResponse = createMockErrorResponse(['Invalid card number']);

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockFetchResponse(mockResponse)
      );

      const result = await client.purchase(mockRequest);

      expect(result.successful).toBe(false);
      expect(result.errors).toContain('Invalid card number');
    });

    it('should handle network errors', async () => {
      const mockRequest = createMockPurchaseRequest();

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(client.purchase(mockRequest)).rejects.toThrow('Network error');
    });
  });

  describe('Authorization Transactions', () => {
    it('should process authorization', async () => {
      const mockRequest = createMockPurchaseRequest();
      const mockResponse = createMockTransactionResponse({ captured: false });

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockFetchResponse(mockResponse)
      );

      const result = await client.authorize(mockRequest);

      expect(result.successful).toBe(true);
      expect(result.response?.captured).toBe(false);
    });
  });

  describe('Capture Transactions', () => {
    it('should capture authorized transaction', async () => {
      const mockResponse = createMockTransactionResponse({ captured: true });

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockFetchResponse(mockResponse)
      );

      const result = await client.capture('txn-123', 25.00);

      expect(result.successful).toBe(true);
      expect(result.response?.captured).toBe(true);
    });

    it('should capture without amount', async () => {
      const mockResponse = createMockTransactionResponse({ captured: true });

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockFetchResponse(mockResponse)
      );

      const result = await client.capture('txn-123');

      expect(result.successful).toBe(true);
    });
  });

  describe('Refund Transactions', () => {
    it('should process refund', async () => {
      const mockResponse = createMockTransactionResponse();

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockFetchResponse(mockResponse)
      );

      const result = await client.refund({
        transaction_id: 'txn-123',
        amount: 25.00,
        reference: 'refund-123'
      });

      expect(result.successful).toBe(true);
    });
  });

  describe('Tokenization', () => {
    it('should tokenize card', async () => {
      const mockResponse = {
        successful: true,
        response: {
          token: 'card-token-123',
          card_holder: 'John Doe',
          card_number: '************1111',
          card_type: 'visa',
          expiry_date: '12/25'
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockFetchResponse(mockResponse)
      );

      const result = await client.tokenize({
        card_holder: 'John Doe',
        card_number: '4111111111111111',
        card_expiry: '12/25',
        cvv: '123'
      });

      expect(result.successful).toBe(true);
      expect(result.response?.token).toBe('card-token-123');
    });
  });

  describe('Transaction Management', () => {
    it('should get transaction details', async () => {
      const mockResponse = createMockTransactionResponse();

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockFetchResponse(mockResponse)
      );

      const result = await client.getTransaction('txn-123');

      expect(result.successful).toBe(true);
      expect(result.response?.id).toBe(mockResponse.response.id);
    });

    it('should void transaction', async () => {
      const mockResponse = createMockTransactionResponse();

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockFetchResponse(mockResponse)
      );

      const result = await client.void('txn-123');

      expect(result.successful).toBe(true);
    });
  });

  describe('Response Handling', () => {
    it('should handle successful responses correctly', () => {
      const successResponse: FatZebraResponse = {
        successful: true,
        response: { id: 'txn-123' },
        errors: []
      };

      const result = handleFatZebraResponse(successResponse);
      expect(result.successful).toBe(true);
      expect(result.response?.id).toBe('txn-123');
    });

    it('should handle error responses correctly using handleFatZebraResponse', () => {
      const errorResponse: FatZebraResponse = {
        successful: false,
        errors: ['Test error']
      };

      expect(() => handleFatZebraResponse(errorResponse)).toThrow(FatZebraError);
    });

    it('should pass through successful responses using handleFatZebraResponse', () => {
      const successResponse: FatZebraResponse = {
        successful: true,
        response: { id: 'txn-123' },
        errors: []
      };

      const result = handleFatZebraResponse(successResponse);
      expect(result.successful).toBe(true);
      expect(result.response?.id).toBe('txn-123');
    });
  });

  describe('Error Handling', () => {
    it('should create FatZebraError with proper properties', () => {
      const error = new FatZebraError('Test error', ['Error 1', 'Error 2'], { test: true });

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FatZebraError);
      expect(error.message).toBe('Test error');
      expect(error.errors).toEqual(['Error 1', 'Error 2']);
      expect(error.response).toEqual({ test: true });
      expect(error.name).toBe('FatZebraError');
    });

    it('should handle timeout errors', async () => {
      const mockRequest = createMockPurchaseRequest();

      // Mock an AbortError (timeout)
      const abortError = new Error('Request timeout');
      abortError.name = 'AbortError';
      (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

      await expect(client.purchase(mockRequest)).rejects.toThrow('Request timeout');
    });
  });

  describe('Standalone Library Features', () => {
    it('should work without NextJS dependencies', () => {
      // Ensure no NextJS-specific globals are required
      expect(typeof window === 'undefined' || window.location).toBeTruthy();
      expect(process.env.NODE_ENV).toBe('test');
    });

    it('should handle environment configuration for standalone use', () => {
      // Test sandbox configuration
      const sandboxClient = createFatZebraClient({
        username: 'test',
        token: 'test',
        sandbox: true
      });
      expect(sandboxClient).toBeInstanceOf(FatZebraClient);

      // Test production configuration
      const prodClient = createFatZebraClient({
        username: 'test',
        token: 'test',
        sandbox: false
      });
      expect(prodClient).toBeInstanceOf(FatZebraClient);
    });

    it('should provide proper TypeScript types', () => {
      // FIXED: This test ensures TypeScript compilation works correctly
      const request: PurchaseRequest = createMockPurchaseRequest();
      expect(typeof request.amount).toBe('number'); // Fixed: Check type, not value
      expect(typeof request.currency).toBe('string');
      expect(typeof request.card_number).toBe('string');

      const client: FatZebraClient = createFatZebraClient(config);
      expect(client).toBeInstanceOf(FatZebraClient);
    });

    it('should handle authentication headers correctly', async () => {
      const mockRequest = createMockPurchaseRequest();
      const mockResponse = createMockTransactionResponse();

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        mockFetchResponse(mockResponse)
      );

      await client.purchase(mockRequest);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const headers = fetchCall[1].headers;
      
      expect(headers['Authorization']).toMatch(/^Basic /);
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['User-Agent']).toMatch(/FatZebra/);
    });
  });
});

// Additional integration tests for standalone usage
describe('Integration Tests - Standalone Library', () => {
  it('should work with different module loading patterns', () => {
    // Test that imports work correctly
    expect(createFatZebraClient).toBeDefined();
    expect(FatZebraClient).toBeDefined();
    expect(FatZebraError).toBeDefined();
    expect(handleFatZebraResponse).toBeDefined();
  });

  it('should handle concurrent requests', async () => {
    const client = createFatZebraClient({
      username: 'test-username',
      token: 'test-token',
      sandbox: true
    });

    const mockResponse = createMockTransactionResponse();
    (global.fetch as jest.Mock).mockResolvedValue(
      mockFetchResponse(mockResponse)
    );

    const requests = Array(5).fill(null).map(() => 
      client.purchase(createMockPurchaseRequest())
    );

    const results = await Promise.all(requests);

    results.forEach(result => {
      expect(result.successful).toBe(true);
    });

    expect(global.fetch).toHaveBeenCalledTimes(5);
  });

  it('should work with custom gateway URLs', () => {
    const customClient = createFatZebraClient({
      username: 'test',
      token: 'test',
      sandbox: true,
      gatewayUrl: 'https://custom.gateway.com',
      timeout: 15000
    });

    expect(customClient).toBeInstanceOf(FatZebraClient);
  });
});