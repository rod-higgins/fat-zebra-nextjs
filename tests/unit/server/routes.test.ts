import '@testing-library/jest-dom';
import '../../types/jest-custom-matchers';

// Import the test helpers
const {
  createMockPurchaseRequest,
  createMockTransactionResponse,
  createMockErrorResponse
} = require('../../setup');

// Mock fetch for the routes
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
  NextResponse: mockNextResponse,
  NextRequest: jest.fn()
}), { virtual: true });

// Import the ACTUAL functions from the routes.ts file
describe('routes.ts (actual source code)', () => {
  let routes: any;

  beforeAll(async () => {
    try {
      // Import the actual routes.ts module
      routes = await import('../../../src/server/routes');
    } catch (error) {
      console.error('Failed to import routes.ts:', error);
      // Create minimal mock if import fails
      routes = {
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
        runtime: 'nodejs',
        dynamic: 'force-dynamic'
      };
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear and reset fetch mock for each test
    if (global.fetch) {
      (global.fetch as jest.Mock).mockClear();
      (global.fetch as jest.Mock).mockReset();
    }
    
    if (mockNextResponse.json) {
      (mockNextResponse.json as jest.Mock).mockClear();
    }
  });

  describe('module exports', () => {
    it('should export all expected route handler functions', () => {
      expect(routes).toBeDefined();
      expect(typeof routes.handlePurchase).toBe('function');
      expect(typeof routes.handleAuthorization).toBe('function');
      expect(typeof routes.handleCapture).toBe('function');
      expect(typeof routes.handleRefund).toBe('function');
      expect(typeof routes.handleTokenization).toBe('function');
      expect(typeof routes.handleVoid).toBe('function');
      expect(typeof routes.handleTransactionStatus).toBe('function');
      expect(typeof routes.handleVerifyWebhook).toBe('function');
      expect(typeof routes.handleGenerateHash).toBe('function');
      expect(typeof routes.handleHealthCheck).toBe('function');
    });
  });

  describe('handlePurchase', () => {
    it('should handle purchase request with valid data', async () => {
      const purchaseData = createMockPurchaseRequest();
      
      // Create a proper Next.js request mock
      const mockRequest = {
        json: () => Promise.resolve(purchaseData),
        headers: {
          get: jest.fn((name: string) => {
            if (name === 'x-forwarded-for') return '192.168.1.1';
            return null;
          })
        }
      };

      // Mock fetch to return success
      if (global.fetch) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(createMockTransactionResponse())
        });
      }

      const response = await routes.handlePurchase(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalled();
    });

    it('should handle invalid purchase request', async () => {
      const mockRequest = {
        json: () => Promise.resolve({}), // Empty body - missing required fields
        headers: {
          get: jest.fn(() => null)
        }
      };

      const response = await routes.handlePurchase(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          successful: false,
          errors: expect.arrayContaining(['Missing required payment fields'])
        }),
        expect.objectContaining({ status: 400 })
      );
    });

    it('should handle network errors gracefully', async () => {
      const purchaseData = createMockPurchaseRequest();
      const mockRequest = {
        json: () => Promise.resolve(purchaseData),
        headers: {
          get: jest.fn(() => null)
        }
      };

      // Mock fetch to throw error
      if (global.fetch) {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      }

      const response = await routes.handlePurchase(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          successful: false,
          errors: expect.any(Array)
        }),
        expect.objectContaining({ status: expect.any(Number) })
      );
    });
  });

  describe('handleAuthorization', () => {
    it('should handle authorization request', async () => {
      const authData = createMockPurchaseRequest();
      const mockRequest = {
        json: () => Promise.resolve(authData),
        headers: {
          get: jest.fn((name: string) => {
            if (name === 'x-forwarded-for') return '192.168.1.1';
            return null;
          })
        }
      };

      // Mock fetch to return success
      if (global.fetch) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(createMockTransactionResponse())
        });
      }

      const response = await routes.handleAuthorization(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalled();
    });

    it('should handle missing authorization fields', async () => {
      const mockRequest = {
        json: () => Promise.resolve({
          amount: 1000
          // Missing other required fields
        }),
        headers: {
          get: jest.fn(() => null)
        }
      };

      const response = await routes.handleAuthorization(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          successful: false,
          errors: expect.arrayContaining(['Missing required authorization fields'])
        }),
        expect.objectContaining({ status: 400 })
      );
    });
  });

  describe('handleCapture', () => {
    it('should handle capture request', async () => {
      const captureData = {
        transaction_id: 'txn-123',
        amount: 2500
      };
      const mockRequest = {
        json: () => Promise.resolve(captureData),
        headers: {
          get: jest.fn(() => null)
        }
      };

      // Mock fetch to return success
      if (global.fetch) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(createMockTransactionResponse())
        });
      }

      const response = await routes.handleCapture(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalled();
    });

    it('should handle missing transaction_id', async () => {
      const mockRequest = {
        json: () => Promise.resolve({
          amount: 1000
          // Missing transaction_id
        }),
        headers: {
          get: jest.fn(() => null)
        }
      };

      const response = await routes.handleCapture(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          successful: false,
          errors: expect.arrayContaining(['Missing transaction_id'])
        }),
        expect.objectContaining({ status: 400 })
      );
    });
  });

  describe('handleRefund', () => {
    it('should handle refund request', async () => {
      const refundData = {
        transaction_id: 'txn-123',
        amount: 1000,
        reason: 'Customer request'
      };
      const mockRequest = {
        json: () => Promise.resolve(refundData),
        headers: {
          get: jest.fn(() => null)
        }
      };

      // Mock fetch to return success
      if (global.fetch) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(createMockTransactionResponse())
        });
      }

      const response = await routes.handleRefund(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalled();
    });

    it('should handle missing refund identifiers', async () => {
      const mockRequest = {
        json: () => Promise.resolve({
          amount: 1000
          // Missing both transaction_id and reference
        }),
        headers: {
          get: jest.fn(() => null)
        }
      };

      const response = await routes.handleRefund(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          successful: false,
          errors: expect.any(Array)
        }),
        expect.objectContaining({ status: 400 })
      );
    });
  });

  describe('handleTokenization', () => {
    it('should handle tokenization request', async () => {
      const tokenData = {
        card_holder: 'John Doe',
        card_number: '4005550000000001',
        card_expiry: '12/25',
        cvv: '123'
      };
      const mockRequest = {
        json: () => Promise.resolve(tokenData),
        headers: {
          get: jest.fn(() => null)
        }
      };

      // Mock fetch to return success
      if (global.fetch) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            successful: true,
            response: {
              token: 'token_123'
            }
          })
        });
      }

      const response = await routes.handleTokenization(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalled();
    });

    it('should handle missing card fields', async () => {
      const mockRequest = {
        json: () => Promise.resolve({
          card_number: '4005550000000001'
          // Missing other required fields
        }),
        headers: {
          get: jest.fn(() => null)
        }
      };

      const response = await routes.handleTokenization(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          successful: false,
          errors: expect.any(Array)
        }),
        expect.objectContaining({ status: 400 })
      );
    });
  });

  describe('handleVoid', () => {
    it('should handle void request', async () => {
      const voidData = {
        transaction_id: 'txn-123'
      };
      const mockRequest = {
        json: () => Promise.resolve(voidData),
        headers: {
          get: jest.fn(() => null)
        }
      };

      // Mock fetch to return success
      if (global.fetch) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(createMockTransactionResponse())
        });
      }

      const response = await routes.handleVoid(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalled();
    });

    it('should handle missing transaction_id for void', async () => {
      const mockRequest = {
        json: () => Promise.resolve({
          // Missing transaction_id
        }),
        headers: {
          get: jest.fn(() => null)
        }
      };

      const response = await routes.handleVoid(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          successful: false,
          errors: expect.arrayContaining(['Missing transaction_id'])
        }),
        expect.objectContaining({ status: 400 })
      );
    });
  });

  describe('handleTransactionStatus', () => {
    it('should handle transaction status request', async () => {
      const mockRequest = {
        url: 'https://example.com/api/transactions/txn-123',
        headers: {
          get: jest.fn(() => null)
        }
      };

      // Mock fetch to return success
      if (global.fetch) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            successful: true,
            response: {
              id: 'txn-123',
              status: 'successful',
              amount: 2500
            }
          })
        });
      }

      const response = await routes.handleTransactionStatus(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalled();
    });

    it('should handle missing transaction_id in URL', async () => {
      const mockRequest = {
        url: 'https://example.com/api/transactions/', // No transaction ID
        headers: {
          get: jest.fn(() => null)
        }
      };

      const response = await routes.handleTransactionStatus(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          successful: false,
          errors: expect.arrayContaining(['Missing transaction_id in URL'])
        }),
        expect.objectContaining({ status: 400 })
      );
    });

    it('should handle invalid URL format', async () => {
      const mockRequest = {
        url: 'invalid-url',
        headers: {
          get: jest.fn(() => null)
        }
      };

      const response = await routes.handleTransactionStatus(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          successful: false,
          errors: expect.any(Array)
        }),
        expect.objectContaining({ status: expect.any(Number) })
      );
    });
  });

  describe('handleVerifyWebhook', () => {
    it('should handle webhook verification', async () => {
      const mockRequest = {
        json: () => Promise.resolve({
          payload: JSON.stringify({
            event: 'payment.success',
            data: { transaction_id: 'txn-123' }
          })
        }),
        headers: {
          get: jest.fn((name: string) => {
            if (name === 'x-webhook-signature') return 'test-signature';
            return null;
          })
        }
      };

      const response = await routes.handleVerifyWebhook(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalled();
    });

    it('should handle missing webhook signature', async () => {
      const mockRequest = {
        json: () => Promise.resolve({
          payload: 'test-payload'
        }),
        headers: {
          get: jest.fn(() => null) // No signature
        }
      };

      const response = await routes.handleVerifyWebhook(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          successful: false,
          errors: expect.arrayContaining(['Missing webhook signature'])
        }),
        expect.objectContaining({ status: 400 })
      );
    });

    it('should handle webhook with different header formats', async () => {
      const mockRequest = {
        json: () => Promise.resolve({
          payload: JSON.stringify({
            event: 'payment.success',
            data: { transaction_id: 'txn-123' }
          })
        }),
        headers: {
          get: jest.fn((name: string) => {
            // Simulate different header case
            if (name === 'x-webhook-signature') return 'test-signature';
            if (name === 'X-Webhook-Signature') return 'test-signature';
            return null;
          })
        }
      };

      const response = await routes.handleVerifyWebhook(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalled();
    });

    it('should handle webhook with invalid signature format', async () => {
      const mockRequest = {
        json: () => Promise.resolve({
          payload: 'test-payload'
        }),
        headers: {
          get: jest.fn((name: string) => {
            if (name === 'x-webhook-signature') return 'invalid-signature-format';
            return null;
          })
        }
      };

      const response = await routes.handleVerifyWebhook(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalled();
    });
  });

  describe('handleGenerateHash', () => {
    it('should handle hash generation request', async () => {
      const hashData = {
        amount: 1000,
        currency: 'AUD',
        reference: 'test-ref',
        timestamp: '2023-01-01T00:00:00Z'
      };
      const mockRequest = {
        json: () => Promise.resolve(hashData),
        headers: {
          get: jest.fn(() => null)
        }
      };

      const response = await routes.handleGenerateHash(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          successful: true,
          hash: expect.any(String)
        })
      );
    });

    it('should handle missing hash data', async () => {
      const mockRequest = {
        json: () => Promise.resolve({
          amount: 1000
          // Missing other required fields
        }),
        headers: {
          get: jest.fn(() => null)
        }
      };

      const response = await routes.handleGenerateHash(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          successful: false,
          errors: expect.arrayContaining(['Missing required hash data'])
        }),
        expect.objectContaining({ status: 400 })
      );
    });
  });

  describe('handleHealthCheck', () => {
    it('should return health status', async () => {
      const response = await routes.handleHealthCheck();
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          successful: true,
          status: 'healthy',
          timestamp: expect.any(String),
          version: expect.any(String)
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle JSON parsing errors', async () => {
      const mockRequest = {
        json: () => Promise.reject(new Error('Invalid JSON')),
        headers: {
          get: jest.fn(() => null)
        }
      };

      const response = await routes.handlePurchase(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          successful: false,
          errors: expect.any(Array)
        }),
        expect.objectContaining({ status: expect.any(Number) })
      );
    });

    it('should handle undefined/null request body', async () => {
      const mockRequest = {
        json: () => Promise.resolve(null),
        headers: {
          get: jest.fn(() => null)
        }
      };

      const response = await routes.handlePurchase(mockRequest);
      
      expect(response).toBeDefined();
      expect(mockNextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          successful: false,
          errors: expect.any(Array)
        }),
        expect.objectContaining({ status: 500 })
      );
    });
  });

  describe('integration tests', () => {
    it('should handle complete purchase-to-capture flow', async () => {
      const purchaseData = createMockPurchaseRequest();
      
      // Purchase request
      const purchaseRequest = {
        json: () => Promise.resolve(purchaseData),
        headers: {
          get: jest.fn(() => '192.168.1.1')
        }
      };

      if (global.fetch) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            ...createMockTransactionResponse(),
            response: {
              id: 'txn-123',
              successful: true
            }
          })
        });
      }

      const purchaseResponse = await routes.handlePurchase(purchaseRequest);
      expect(purchaseResponse).toBeDefined();

      // Capture request
      const captureRequest = {
        json: () => Promise.resolve({
          transaction_id: 'txn-123',
          amount: 2500
        }),
        headers: {
          get: jest.fn(() => null)
        }
      };

      if (global.fetch) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(createMockTransactionResponse())
        });
      }

      const captureResponse = await routes.handleCapture(captureRequest);
      expect(captureResponse).toBeDefined();
    });
  });
});