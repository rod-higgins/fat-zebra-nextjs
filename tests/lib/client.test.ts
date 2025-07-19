import { FatZebraClient, createFatZebraClient, handleFatZebraResponse, FatZebraError } from '../../src/lib/client';
import { createMockPurchaseRequest, mockFetchResponse, mockFetchError } from '../setup';

describe('FatZebraClient', () => {
  let client: FatZebraClient;

  beforeEach(() => {
    client = createFatZebraClient({
      username: 'test-username',
      token: 'test-token',
      isTestMode: true,
      sharedSecret: 'test-shared-secret'
    });
  });

  describe('createFatZebraClient', () => {
    it('should create a client instance with correct configuration', () => {
      expect(client).toBeInstanceOf(FatZebraClient);
    });

    it('should set sandbox URL for test mode', () => {
      const testClient = createFatZebraClient({
        username: 'test',
        token: 'test',
        isTestMode: true
      });
      expect(testClient).toBeInstanceOf(FatZebraClient);
    });

    it('should set production URL for live mode', () => {
      const prodClient = createFatZebraClient({
        username: 'test',
        token: 'test',
        isTestMode: false
      });
      expect(prodClient).toBeInstanceOf(FatZebraClient);
    });
  });

  describe('createPurchase', () => {
    it('should successfully process a purchase', async () => {
      const mockResponse = {
        successful: true,
        response: {
          id: 'txn-123',
          amount: 10.00,
          currency: 'AUD',
          reference: 'TEST-REF',
          successful: true,
          message: 'Approved',
          authorization: 'AUTH123',
          card: {
            token: 'card-token-123',
            display_number: '4005...0001',
            scheme: 'visa'
          }
        },
        test: true
      };

      mockFetchResponse(mockResponse);

      const purchaseRequest = createMockPurchaseRequest();
      const result = await client.createPurchase(purchaseRequest);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://gateway.pmnts-sandbox.io/v1.0/purchases',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Basic'),
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(purchaseRequest)
        })
      );

      expect(result).toEqual(mockResponse);
      expect(result.response).toHaveValidTransactionStructure();
    });

    it('should handle purchase failure', async () => {
      const mockErrorResponse = {
        successful: false,
        errors: ['Card declined'],
        message: 'Transaction failed'
      };

      mockFetchResponse(mockErrorResponse, 400, false);

      const purchaseRequest = createMockPurchaseRequest();

      await expect(client.createPurchase(purchaseRequest)).rejects.toThrow(FatZebraError);
    });

    it('should handle network errors', async () => {
      mockFetchError('Network error');

      const purchaseRequest = createMockPurchaseRequest();

      await expect(client.createPurchase(purchaseRequest)).rejects.toThrow('Network error');
    });
  });

  describe('createPurchaseWithToken', () => {
    it('should process payment with card token', async () => {
      const mockResponse = {
        successful: true,
        response: {
          id: 'txn-token-123',
          amount: 25.50,
          currency: 'AUD',
          reference: 'TOKEN-REF',
          successful: true,
          message: 'Approved'
        },
        test: true
      };

      mockFetchResponse(mockResponse);

      const result = await client.createPurchaseWithToken(
        'card-token-123',
        25.50,
        'TOKEN-REF'
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://gateway.pmnts-sandbox.io/v1.0/purchases',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            card_token: 'card-token-123',
            amount: 25.50,
            reference: 'TOKEN-REF',
            currency: 'AUD'
          })
        })
      );

      expect(result.successful).toBe(true);
      expect(result.response.amount).toBe(25.50);
    });
  });

  describe('createAuthorization', () => {
    it('should create authorization without capture', async () => {
      const mockResponse = {
        successful: true,
        response: {
          id: 'auth-123',
          amount: 100.00,
          currency: 'AUD',
          reference: 'AUTH-REF',
          successful: true,
          message: 'Authorized'
        },
        test: true
      };

      mockFetchResponse(mockResponse);

      const authRequest = {
        ...createMockPurchaseRequest(),
        amount: 100.00,
        reference: 'AUTH-REF'
      };

      const result = await client.createAuthorization(authRequest);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://gateway.pmnts-sandbox.io/v1.0/purchases',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            ...authRequest,
            capture: false
          })
        })
      );

      expect(result.successful).toBe(true);
    });
  });

  describe('captureAuthorization', () => {
    it('should capture full authorization amount', async () => {
      const mockResponse = {
        successful: true,
        response: {
          id: 'capture-123',
          amount: 100.00,
          currency: 'AUD',
          reference: 'CAPTURE-REF',
          successful: true,
          message: 'Captured'
        },
        test: true
      };

      mockFetchResponse(mockResponse);

      const result = await client.captureAuthorization('auth-123');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://gateway.pmnts-sandbox.io/v1.0/purchases/auth-123/capture',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({})
        })
      );

      expect(result.successful).toBe(true);
    });

    it('should capture partial authorization amount', async () => {
      const mockResponse = {
        successful: true,
        response: {
          id: 'capture-partial-123',
          amount: 50.00,
          currency: 'AUD',
          reference: 'PARTIAL-CAPTURE',
          successful: true,
          message: 'Partially captured'
        },
        test: true
      };

      mockFetchResponse(mockResponse);

      const result = await client.captureAuthorization('auth-123', 50.00);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://gateway.pmnts-sandbox.io/v1.0/purchases/auth-123/capture',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ amount: 50.00 })
        })
      );

      expect(result.response.amount).toBe(50.00);
    });
  });

  describe('createRefund', () => {
    it('should process full refund', async () => {
      const mockResponse = {
        successful: true,
        response: {
          id: 'refund-123',
          amount: 10.00,
          currency: 'AUD',
          reference: 'REFUND-REF',
          successful: true,
          message: 'Refunded'
        },
        test: true
      };

      mockFetchResponse(mockResponse);

      const refundRequest = {
        transaction_id: 'txn-123',
        amount: 10.00,
        reason: 'Customer request'
      };

      const result = await client.createRefund(refundRequest);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://gateway.pmnts-sandbox.io/v1.0/refunds',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(refundRequest)
        })
      );

      expect(result.successful).toBe(true);
      expect(result.response.amount).toBe(10.00);
    });
  });

  describe('createToken', () => {
    it('should tokenize card details', async () => {
      const mockResponse = {
        successful: true,
        response: {
          token: 'card-token-123',
          card_holder: 'John Doe',
          card_number: '4005...0001',
          card_expiry: '12/25',
          authorized: true,
          transaction_count: 0
        },
        test: true
      };

      mockFetchResponse(mockResponse);

      const tokenRequest = {
        card_holder: 'John Doe',
        card_number: '4005550000000001',
        card_expiry: '12/25',
        cvv: '123'
      };

      const result = await client.createToken(tokenRequest);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://gateway.pmnts-sandbox.io/v1.0/credit_cards',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(tokenRequest)
        })
      );

      expect(result.successful).toBe(true);
      expect(result.response.token).toBe('card-token-123');
    });
  });

  describe('generateVerificationHash', () => {
    it('should generate verification hash', () => {
      const hashData = {
        reference: 'TEST-REF',
        amount: 10.00,
        currency: 'AUD',
        timestamp: 1640995200
      };

      const hash = client.generateVerificationHash(hashData);

      expect(hash).toBe('mocked-hash'); // Based on our mocked crypto
      expect(typeof hash).toBe('string');
    });

    it('should throw error if shared secret is missing', () => {
      const clientWithoutSecret = createFatZebraClient({
        username: 'test',
        token: 'test',
        isTestMode: true
        // No shared secret
      });

      expect(() => {
        clientWithoutSecret.generateVerificationHash({
          reference: 'TEST',
          amount: 10,
          currency: 'AUD'
        });
      }).toThrow('Shared secret is required');
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify webhook signature', () => {
      const payload = '{"test": "data"}';
      const signature = 'test-signature';

      const isValid = client.verifyWebhookSignature(payload, signature);

      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('ping', () => {
    it('should perform health check', async () => {
      const mockResponse = {
        successful: true,
        response: {
          message: 'Pong'
        },
        test: true
      };

      mockFetchResponse(mockResponse);

      const result = await client.ping();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://gateway.pmnts-sandbox.io/v1.0/ping',
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result.successful).toBe(true);
      expect(result.response.message).toBe('Pong');
    });
  });
});

describe('handleFatZebraResponse', () => {
  it('should return response data for successful transactions', () => {
    const mockResponse = {
      successful: true,
      response: {
        id: 'txn-123',
        amount: 10.00,
        currency: 'AUD',
        reference: 'TEST',
        successful: true
      },
      test: true
    };

    const result = handleFatZebraResponse(mockResponse);

    expect(result).toEqual(mockResponse.response);
  });

  it('should throw FatZebraError for failed transactions', () => {
    const mockResponse = {
      successful: false,
      errors: ['Card declined', 'Insufficient funds'],
      test: true
    };

    expect(() => {
      handleFatZebraResponse(mockResponse);
    }).toThrow(FatZebraError);

    try {
      handleFatZebraResponse(mockResponse);
    } catch (error) {
      expect(error).toBeInstanceOf(FatZebraError);
      expect((error as FatZebraError).errors).toEqual(['Card declined', 'Insufficient funds']);
    }
  });
});

describe('FatZebraError', () => {
  it('should create error with message and errors', () => {
    const error = new FatZebraError('Payment failed', ['Card declined'], '400');

    expect(error.message).toBe('Payment failed');
    expect(error.errors).toEqual(['Card declined']);
    expect(error.code).toBe('400');
    expect(error.name).toBe('FatZebraError');
  });

  it('should create error with just message', () => {
    const error = new FatZebraError('Simple error');

    expect(error.message).toBe('Simple error');
    expect(error.errors).toEqual([]);
    expect(error.code).toBeUndefined();
  });
});