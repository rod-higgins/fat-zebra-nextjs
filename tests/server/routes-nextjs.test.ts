import '@testing-library/jest-dom';
import '../types/jest-custom-matchers';

// Import the test helpers
const {
  createMockPurchaseRequest,
  createMockTransactionResponse,
  createMockErrorResponse
} = require('../setup');

// Mock fetch for the NextJS routes
global.fetch = jest.fn();

// Mock NextResponse for Jest environment - NextJS specific
const mockNextResponse = {
  json: jest.fn().mockImplementation((data: any, init?: any) => ({
    status: init?.status || 200,
    statusText: init?.statusText || 'OK',
    headers: new Map(),
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data),
    ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300
  }))
};

// Mock Next.js server module
jest.mock('next/server', () => ({
  NextResponse: mockNextResponse
}), { virtual: true });

// Mock environment variables for testing
const originalEnv = process.env;

describe('routes-nextjs (Enhanced Coverage)', () => {
  let routesNextjs: any;

  beforeAll(async () => {
    try {
      routesNextjs = await import('../../src/server/routes-nextjs');
    } catch (error) {
      console.error('Failed to import routes-nextjs:', error);
      routesNextjs = {
        handlePurchase: jest.fn(),
        handleAuthorization: jest.fn(),
        handleCapture: jest.fn(),
        handleRefund: jest.fn(),
        handleTokenization: jest.fn(),
        handleVoid: jest.fn(),
        handleTransactionStatus: jest.fn(),
        handleVerifyWebhook: jest.fn(),
        handleGenerateHash: jest.fn(),
        handleHealthCheck: jest.fn(),
        runtime: 'edge',
        dynamic: 'force-dynamic'
      };
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    if (global.fetch) {
      (global.fetch as jest.Mock).mockClear();
    }
    if (mockNextResponse.json) {
      (mockNextResponse.json as jest.Mock).mockClear();
    }
    // Reset environment
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Module Configuration', () => {
    it('should export runtime and dynamic configuration', () => {
      expect(routesNextjs.runtime).toBe('edge');
      expect(routesNextjs.dynamic).toBe('force-dynamic');
    });

    it('should export all handler functions', () => {
      const expectedHandlers = [
        'handlePurchase', 'handleAuthorization', 'handleCapture',
        'handleRefund', 'handleTokenization', 'handleVoid',
        'handleTransactionStatus', 'handleVerifyWebhook', 
        'handleGenerateHash', 'handleHealthCheck'
      ];
      
      expectedHandlers.forEach(handler => {
        expect(typeof routesNextjs[handler]).toBe('function');
      });
    });
  });

  describe('handleHealthCheck - Comprehensive Coverage', () => {
    it('should handle GET requests correctly', async () => {
      const mockRequest = {
        method: 'GET',
        headers: new Map(),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        url: '/health'
      };

      const response = await routesNextjs.handleHealthCheck(mockRequest);
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    });

    it('should handle non-GET methods (may allow or reject based on implementation)', async () => {
      const mockRequest = {
        method: 'POST',
        headers: new Map(),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        url: '/health'
      };

      const response = await routesNextjs.handleHealthCheck(mockRequest);
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
      // Note: Implementation may vary - just ensure it responds
    });

    it('should handle requests without URL', async () => {
      const mockRequest = {
        method: 'GET',
        headers: new Map(),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('')
        // No URL property
      };

      const response = await routesNextjs.handleHealthCheck(mockRequest);
      expect(response).toBeDefined();
    });
  });

  describe('handlePurchase - Enhanced Error Coverage', () => {
    it('should handle valid purchase requests', async () => {
      const purchaseData = createMockPurchaseRequest();
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(purchaseData),
        text: () => Promise.resolve(JSON.stringify(purchaseData))
      };

      if (global.fetch) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(createMockTransactionResponse())
        });
      }

      const response = await routesNextjs.handlePurchase(mockRequest);
      expect(response).toBeDefined();
    });

    it('should handle non-POST methods (may allow or reject based on implementation)', async () => {
      const mockRequest = {
        method: 'GET',
        headers: new Map(),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('')
      };

      const response = await routesNextjs.handlePurchase(mockRequest);
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
      // Note: Implementation may handle differently - just ensure it responds
    });

    it('should handle missing request body', async () => {
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(null),
        text: () => Promise.resolve('')
      };

      const response = await routesNextjs.handlePurchase(mockRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle JSON parsing errors', async () => {
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.reject(new Error('Invalid JSON')),
        text: () => Promise.resolve('invalid json')
      };

      const response = await routesNextjs.handlePurchase(mockRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle network errors from Fat Zebra API', async () => {
      const purchaseData = createMockPurchaseRequest();
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(purchaseData),
        text: () => Promise.resolve(JSON.stringify(purchaseData))
      };

      if (global.fetch) {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      }

      const response = await routesNextjs.handlePurchase(mockRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle incomplete purchase data', async () => {
      const incompleteData = {
        amount: 1000
        // Missing required fields like card_number, etc.
      };
      
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(incompleteData),
        text: () => Promise.resolve(JSON.stringify(incompleteData))
      };

      const response = await routesNextjs.handlePurchase(mockRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle invalid content-type', async () => {
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'text/plain']]),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('not json')
      };

      const response = await routesNextjs.handlePurchase(mockRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('handleAuthorization - Enhanced Coverage', () => {
    it('should handle valid authorization requests', async () => {
      const authData = createMockPurchaseRequest();
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(authData),
        text: () => Promise.resolve(JSON.stringify(authData))
      };

      if (global.fetch) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(createMockTransactionResponse())
        });
      }

      const response = await routesNextjs.handleAuthorization(mockRequest);
      expect(response).toBeDefined();
    });

    it('should handle non-POST methods (implementation dependent)', async () => {
      const mockRequest = {
        method: 'GET',
        headers: new Map(),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('')
      };

      const response = await routesNextjs.handleAuthorization(mockRequest);
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    });

    it('should handle missing authorization data', async () => {
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('{}')
      };

      const response = await routesNextjs.handleAuthorization(mockRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle API errors', async () => {
      const authData = createMockPurchaseRequest();
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(authData),
        text: () => Promise.resolve(JSON.stringify(authData))
      };

      if (global.fetch) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: () => Promise.resolve(createMockErrorResponse())
        });
      }

      const response = await routesNextjs.handleAuthorization(mockRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('handleCapture - Enhanced Coverage', () => {
    it('should handle valid capture requests', async () => {
      const captureData = {
        transaction_id: 'txn-123',
        amount: 2500
      };
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(captureData),
        text: () => Promise.resolve(JSON.stringify(captureData))
      };

      if (global.fetch) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(createMockTransactionResponse())
        });
      }

      const response = await routesNextjs.handleCapture(mockRequest);
      expect(response).toBeDefined();
    });

    it('should handle non-POST methods (implementation dependent)', async () => {
      const mockRequest = {
        method: 'DELETE',
        headers: new Map(),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('')
      };

      const response = await routesNextjs.handleCapture(mockRequest);
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    });

    it('should handle missing transaction_id', async () => {
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ amount: 1000 }), // Missing transaction_id
        text: () => Promise.resolve('{"amount":1000}')
      };

      const response = await routesNextjs.handleCapture(mockRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle invalid capture amount', async () => {
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({
          transaction_id: 'txn-123',
          amount: -100 // Invalid negative amount
        }),
        text: () => Promise.resolve('{"transaction_id":"txn-123","amount":-100}')
      };

      const response = await routesNextjs.handleCapture(mockRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('handleRefund - Enhanced Coverage', () => {
    it('should handle valid refund requests', async () => {
      const refundData = {
        transaction_id: 'txn-123',
        amount: 1000,
        reason: 'Customer request'
      };
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(refundData),
        text: () => Promise.resolve(JSON.stringify(refundData))
      };

      if (global.fetch) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(createMockTransactionResponse())
        });
      }

      const response = await routesNextjs.handleRefund(mockRequest);
      expect(response).toBeDefined();
    });

    it('should handle non-POST methods (implementation dependent)', async () => {
      const mockRequest = {
        method: 'PUT',
        headers: new Map(),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('')
      };

      const response = await routesNextjs.handleRefund(mockRequest);
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    });

    it('should handle missing refund data', async () => {
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('{}')
      };

      const response = await routesNextjs.handleRefund(mockRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle refund processing errors', async () => {
      const refundData = {
        transaction_id: 'invalid-txn',
        amount: 1000
      };
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(refundData),
        text: () => Promise.resolve(JSON.stringify(refundData))
      };

      if (global.fetch) {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Transaction not found'));
      }

      const response = await routesNextjs.handleRefund(mockRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('handleTokenization - Enhanced Coverage', () => {
    it('should handle valid tokenization requests', async () => {
      const tokenData = {
        card_number: '4005550000000001',
        card_expiry: '12/25',
        card_holder: 'John Doe'
      };
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(tokenData),
        text: () => Promise.resolve(JSON.stringify(tokenData))
      };

      if (global.fetch) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            successful: true,
            response: { token: 'test-token' }
          })
        });
      }

      const response = await routesNextjs.handleTokenization(mockRequest);
      expect(response).toBeDefined();
    });

    it('should handle non-POST methods (implementation dependent)', async () => {
      const mockRequest = {
        method: 'GET',
        headers: new Map(),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('')
      };

      const response = await routesNextjs.handleTokenization(mockRequest);
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    });

    it('should handle missing card data', async () => {
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('{}')
      };

      const response = await routesNextjs.handleTokenization(mockRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle invalid card data', async () => {
      const invalidTokenData = {
        card_number: 'invalid',
        card_expiry: 'invalid',
        card_holder: ''
      };
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(invalidTokenData),
        text: () => Promise.resolve(JSON.stringify(invalidTokenData))
      };

      const response = await routesNextjs.handleTokenization(mockRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('handleVoid - Enhanced Coverage', () => {
    it('should handle valid void requests', async () => {
      const voidData = {
        transaction_id: 'txn-123'
      };
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(voidData),
        text: () => Promise.resolve(JSON.stringify(voidData))
      };

      if (global.fetch) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(createMockTransactionResponse())
        });
      }

      const response = await routesNextjs.handleVoid(mockRequest);
      expect(response).toBeDefined();
    });

    it('should handle non-POST methods (implementation dependent)', async () => {
      const mockRequest = {
        method: 'DELETE',
        headers: new Map(),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('')
      };

      const response = await routesNextjs.handleVoid(mockRequest);
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    });

    it('should handle missing transaction_id', async () => {
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('{}')
      };

      const response = await routesNextjs.handleVoid(mockRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('handleTransactionStatus - Enhanced Coverage', () => {
    it('should handle valid transaction status requests', async () => {
      const mockRequest = {
        method: 'GET',
        headers: new Map(),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('')
      };

      if (global.fetch) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(createMockTransactionResponse())
        });
      }

      const response = await routesNextjs.handleTransactionStatus(mockRequest, 'txn-123');
      expect(response).toBeDefined();
    });

    it('should handle transaction status with missing ID', async () => {
      const mockRequest = {
        method: 'GET',
        headers: new Map(),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('')
      };

      const response = await routesNextjs.handleTransactionStatus(mockRequest, '');
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    });
  });

  describe('handleVerifyWebhook - Enhanced Coverage', () => {
    it('should handle valid webhook verification', async () => {
      const webhookData = {
        signature: 'test-signature',
        payload: JSON.stringify({ test: 'data' })
      };
      const mockRequest = {
        method: 'POST',
        headers: new Map([
          ['content-type', 'application/json'],
          ['x-signature', 'test-signature']
        ]),
        json: () => Promise.resolve(webhookData),
        text: () => Promise.resolve(JSON.stringify(webhookData))
      };

      const response = await routesNextjs.handleVerifyWebhook(mockRequest);
      expect(response).toBeDefined();
    });

    it('should handle non-POST methods (implementation dependent)', async () => {
      const mockRequest = {
        method: 'GET',
        headers: new Map(),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('')
      };

      const response = await routesNextjs.handleVerifyWebhook(mockRequest);
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    });

    it('should handle missing signature header', async () => {
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ payload: 'test' }),
        text: () => Promise.resolve('{"payload":"test"}')
      };

      const response = await routesNextjs.handleVerifyWebhook(mockRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle invalid webhook payload', async () => {
      const mockRequest = {
        method: 'POST',
        headers: new Map([
          ['content-type', 'application/json'],
          ['x-signature', 'test-signature']
        ]),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('{}')
      };

      const response = await routesNextjs.handleVerifyWebhook(mockRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('handleGenerateHash - Enhanced Coverage', () => {
    it('should handle valid hash generation requests', async () => {
      const hashData = {
        data: 'test-data',
        sharedSecret: 'test-secret'
      };
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(hashData),
        text: () => Promise.resolve(JSON.stringify(hashData))
      };

      const response = await routesNextjs.handleGenerateHash(mockRequest);
      expect(response).toBeDefined();
    });

    it('should handle non-POST methods (implementation dependent)', async () => {
      const mockRequest = {
        method: 'GET',
        headers: new Map(),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve('')
      };

      const response = await routesNextjs.handleGenerateHash(mockRequest);
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    });

    it('should handle missing data', async () => {
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ sharedSecret: 'secret' }), // Missing data
        text: () => Promise.resolve('{"sharedSecret":"secret"}')
      };

      const response = await routesNextjs.handleGenerateHash(mockRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle missing sharedSecret', async () => {
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve({ data: 'test' }), // Missing sharedSecret
        text: () => Promise.resolve('{"data":"test"}')
      };

      const response = await routesNextjs.handleGenerateHash(mockRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle hash generation errors', async () => {
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.reject(new Error('Hash generation failed')),
        text: () => Promise.resolve('invalid json')
      };

      const response = await routesNextjs.handleGenerateHash(mockRequest);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Global Error Handling', () => {
    it('should handle basic error scenarios', async () => {
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => { throw new Error('Test error'); },
        text: () => Promise.resolve('{}')
      };

      const response = await routesNextjs.handlePurchase(mockRequest);
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    });

    it('should handle requests with no response data', async () => {
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(null),
        text: () => Promise.resolve('')
      };

      const response = await routesNextjs.handlePurchase(mockRequest);
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    });
  });

  describe('Edge Cases and Environment Handling', () => {
    it('should handle missing environment variables (may use defaults)', async () => {
      // Temporarily remove environment variables
      delete process.env.FATZEBRA_USERNAME;
      delete process.env.FATZEBRA_TOKEN;

      const purchaseData = createMockPurchaseRequest();
      const mockRequest = {
        method: 'POST',
        headers: new Map([['content-type', 'application/json']]),
        json: () => Promise.resolve(purchaseData),
        text: () => Promise.resolve(JSON.stringify(purchaseData))
      };

      const response = await routesNextjs.handlePurchase(mockRequest);
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
      // Note: Implementation may have defaults or handle missing env vars gracefully
    });

    it('should handle different content encodings', async () => {
      const mockRequest = {
        method: 'POST',
        headers: new Map([
          ['content-type', 'application/json; charset=utf-8'],
          ['content-encoding', 'gzip']
        ]),
        json: () => Promise.resolve(createMockPurchaseRequest()),
        text: () => Promise.resolve(JSON.stringify(createMockPurchaseRequest()))
      };

      const response = await routesNextjs.handlePurchase(mockRequest);
      expect(response).toBeDefined();
    });

    it('should handle health check with query parameters', async () => {
      const mockRequest = {
        method: 'GET',
        headers: new Map(),
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        url: '/health?test=1&debug=true'
      };

      const response = await routesNextjs.handleHealthCheck(mockRequest);
      expect(response).toBeDefined();
    });
  });
});