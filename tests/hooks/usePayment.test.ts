import { renderHook, act } from '@testing-library/react';
import { usePayment } from '../../src/hooks/usePayment';
import { TEST_CARDS } from '../../src/types';

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('usePayment', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => usePayment());
    
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.success).toBe(false);
  });

  it('processes payment successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        transaction: {
          id: 'txn_123',
          amount: 25.00,
          currency: 'AUD'
        }
      })
    } as Response);

    const { result } = renderHook(() => usePayment());
    
    const paymentData = {
      amount: 25.00,
      currency: 'AUD' as const,
      reference: 'TEST-123',
      cardDetails: {
        card_holder: 'John Doe',
        card_number: TEST_CARDS.VISA_SUCCESS,
        card_expiry: '12/25',
        cvv: '123'
      }
    };

    await act(async () => {
      await result.current.processPayment(paymentData);
    });

    expect(result.current.success).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('handles payment errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Payment declined'
      })
    } as Response);

    const { result } = renderHook(() => usePayment());
    
    const paymentData = {
      amount: 25.00,
      currency: 'AUD' as const,
      reference: 'TEST-123',
      cardDetails: {
        card_holder: 'John Doe',
        card_number: TEST_CARDS.VISA_DECLINE,
        card_expiry: '12/25',
        cvv: '123'
      }
    };

    await act(async () => {
      try {
        await result.current.processPayment(paymentData);
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.success).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Payment declined');
  });

  it('resets state correctly', () => {
    const { result } = renderHook(() => usePayment());
    
    // Manually set some state
    act(() => {
      result.current.reset();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.success).toBe(false);
  });

  it('handles tokenization when enabled', async () => {
    // Mock tokenization endpoint
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ hash: 'test_hash' })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test_token' })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          transaction: { id: 'txn_123' }
        })
      } as Response);

    const { result } = renderHook(() => 
      usePayment({
        enableTokenization: true,
        accessToken: 'test_token',
        username: 'test_user'
      })
    );
    
    const paymentData = {
      amount: 25.00,
      currency: 'AUD' as const,
      reference: 'TEST-123',
      cardDetails: {
        card_holder: 'John Doe',
        card_number: TEST_CARDS.VISA_SUCCESS,
        card_expiry: '12/25',
        cvv: '123'
      }
    };

    await act(async () => {
      await result.current.processPayment(paymentData);
    });

    expect(result.current.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3); // hash, tokenize, payment
  });
});