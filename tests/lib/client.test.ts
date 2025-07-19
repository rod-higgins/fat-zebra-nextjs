import { FatZebraClient, createFatZebraClient } from '../../src/lib/client';
import { TEST_CARDS } from '../../src/types';

// Mock fetch for server-side tests
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('FatZebraClient', () => {
  let client: FatZebraClient;

  beforeEach(() => {
    client = createFatZebraClient({
      username: 'test_username',
      token: 'test_token',
      isTestMode: true
    });
    
    mockFetch.mockClear();
  });

  it('creates client with correct configuration', () => {
    expect(client).toBeInstanceOf(FatZebraClient);
  });

  it('makes purchase request correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        successful: true,
        response: {
          id: 'txn_123',
          amount: 25.00,
          currency: 'AUD',
          successful: true
        }
      })
    } as Response);

    const purchaseRequest = {
      amount: 25.00,
      currency: 'AUD' as const,
      reference: 'TEST-123',
      card_details: {
        card_holder: 'John Doe',
        card_number: TEST_CARDS.VISA_SUCCESS,
        card_expiry: '12/25',
        cvv: '123'
      }
    };

    const response = await client.createPurchase(purchaseRequest);
    
    expect(response.successful).toBe(true);
    expect(response.response.id).toBe('txn_123');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/purchases'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    );
  });

  it('handles API errors correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        successful: false,
        errors: ['Invalid card number']
      })
    } as Response);

    const purchaseRequest = {
      amount: 25.00,
      currency: 'AUD' as const,
      reference: 'TEST-123',
      card_details: {
        card_holder: 'John Doe',
        card_number: '1234567890123456',
        card_expiry: '12/25',
        cvv: '123'
      }
    };

    const response = await client.createPurchase(purchaseRequest);
    
    expect(response.successful).toBe(false);
    expect(response.errors).toContain('Invalid card number');
  });

  it('generates correct authorization header', () => {
    // This tests the private method indirectly through a request
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ping: 'pong' })
    } as Response);

    client.ping();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': expect.stringMatching(/^Basic /)
        })
      })
    );
  });

  it('verifies webhook signatures correctly', () => {
    const clientWithSecret = createFatZebraClient({
      username: 'test_username',
      token: 'test_token',
      sharedSecret: 'test_secret',
      isTestMode: true
    });

    const payload = 'test_payload';
    const validSignature = require('crypto')
      .createHmac('sha256', 'test_secret')
      .update(payload)
      .digest('hex');

    expect(clientWithSecret.verifyWebhookSignature(payload, validSignature)).toBe(true);
    expect(clientWithSecret.verifyWebhookSignature(payload, 'invalid_signature')).toBe(false);
  });
});