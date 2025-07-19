import { renderHook, act, waitFor } from '@testing-library/react';
import { usePayment, useOAuthPayment, useTokenPayment, usePaymentEvents } from '../../src/hooks/usePayment';
import { createMockCardDetails, createMockPurchaseRequest, mockFetchResponse, mockFetchError } from '../setup';

// Mock fetch globally
global.fetch = jest.fn();

describe('usePayment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        transaction: {
          id: 'txn-123',
          amount: 10.00,
          currency: 'AUD',
          reference: 'TEST-REF',
          successful: true
        }
      })
    });
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => usePayment());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(false);
      expect(typeof result.current.processPayment).toBe('function');
      expect(typeof result.current.tokenizeCard).toBe('function');
      expect(typeof result.current.verifyCard).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });

    it('should accept options', () => {
      const options = {
        enableTokenization: true,
        enable3DS: true,
        accessToken: 'test-token',
        username: 'test-username',
        autoReset: false
      };

      const { result } = renderHook(() => usePayment(options));

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(false);
    });
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      const { result } = renderHook(() => usePayment());

      const paymentData = {
        amount: 10.00,
        currency: 'AUD',
        reference: 'TEST-REF',
        cardDetails: createMockCardDetails()
      };

      await act(async () => {
        await result.current.processPayment(paymentData);
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(true);

      expect(global.fetch).toHaveBeenCalledWith('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 10.00,
          currency: 'AUD',
          reference: 'TEST-REF',
          cardDetails: paymentData.cardDetails,
          customer: undefined,
          customerIp: '127.0.0.1'
        })
      });
    });

    it('should handle payment failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'Card declined'
        })
      });

      const { result } = renderHook(() => usePayment());

      const paymentData = {
        amount: 10.00,
        currency: 'AUD',
        reference: 'TEST-REF',
        cardDetails: createMockCardDetails()
      };

      await act(async () => {
        try {
          await result.current.processPayment(paymentData);
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Card declined');
      expect(result.current.success).toBe(false);
    });

    it('should validate payment data', async () => {
      const { result } = renderHook(() => usePayment());

      await act(async () => {
        try {
          await result.current.processPayment({
            amount: 0, // Invalid amount
            currency: 'AUD',
            reference: 'TEST-REF',
            cardDetails: createMockCardDetails()
          });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe('Invalid payment data provided');
    });

    it('should set loading state during processing', async () => {
      const { result } = renderHook(() => usePayment());

      const paymentData = {
        amount: 10.00,
        currency: 'AUD',
        reference: 'TEST-REF',
        cardDetails: createMockCardDetails()
      };

      let loadingDuringProcess = false;

      await act(async () => {
        const promise = result.current.processPayment(paymentData);
        loadingDuringProcess = result.current.loading;
        await promise;
      });

      expect(loadingDuringProcess).toBe(true);
      expect(result.current.loading).toBe(false);
    });

    it('should prevent concurrent payment processing', async () => {
      const { result } = renderHook(() => usePayment());

      const paymentData = {
        amount: 10.00,
        currency: 'AUD',
        reference: 'TEST-REF',
        cardDetails: createMockCardDetails()
      };

      await act(async () => {
        const promise1 = result.current.processPayment(paymentData);
        const promise2 = result.current.processPayment(paymentData);
        
        await promise1;
        await promise2;
      });

      // Should only call fetch once due to loading check
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should auto-reset after successful payment when enabled', async () => {
      jest.useFakeTimers();
      
      const { result } = renderHook(() => usePayment({ autoReset: true }));

      const paymentData = {
        amount: 10.00,
        currency: 'AUD',
        reference: 'TEST-REF',
        cardDetails: createMockCardDetails()
      };

      await act(async () => {
        await result.current.processPayment(paymentData);
      });

      expect(result.current.success).toBe(true);

      // Fast-forward timers
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(result.current.success).toBe(false);
      expect(result.current.error).toBe(null);

      jest.useRealTimers();
    });
  });

  describe('processPayment with 3DS', () => {
    it('should process 3DS payment when enabled', async () => {
      const { result } = renderHook(() => usePayment({
        enable3DS: true,
        accessToken: 'test-token',
        username: 'test-username'
      }));

      // Mock 3DS payment endpoint
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          transaction: {
            id: 'txn-3ds-123',
            amount: 10.00,
            currency: 'AUD',
            reference: 'TEST-3DS-REF',
            successful: true
          }
        })
      });

      const paymentData = {
        amount: 10.00,
        currency: 'AUD',
        reference: 'TEST-3DS-REF',
        cardDetails: createMockCardDetails()
      };

      await act(async () => {
        await result.current.processPayment(paymentData);
      });

      expect(result.current.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/payments/with-3ds', expect.any(Object));
    });
  });

  describe('tokenizeCard', () => {
    it('should tokenize card successfully when enabled', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          token: 'card-token-123'
        })
      });

      const { result } = renderHook(() => usePayment({ enableTokenization: true }));

      const cardDetails = createMockCardDetails();
      let token: string;

      await act(async () => {
        token = await result.current.tokenizeCard(cardDetails);
      });

      expect(token!).toBe('card-token-123');
      expect(global.fetch).toHaveBeenCalledWith('/api/tokenize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardDetails: {
            card_holder: cardDetails.card_holder,
            card_number: cardDetails.card_number,
            card_expiry: cardDetails.card_expiry,
            cvv: cardDetails.cvv
          }
        })
      });
    });

    it('should reject tokenization when not enabled', async () => {
      const { result } = renderHook(() => usePayment({ enableTokenization: false }));

      await act(async () => {
        try {
          await result.current.tokenizeCard(createMockCardDetails());
        } catch (error) {
          expect(error).toEqual(new Error('Tokenization is not enabled'));
        }
      });
    });

    it('should handle tokenization failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'Invalid card details'
        })
      });

      const { result } = renderHook(() => usePayment({ enableTokenization: true }));

      await act(async () => {
        try {
          await result.current.tokenizeCard(createMockCardDetails());
        } catch (error) {
          expect(error).toEqual(new Error('Invalid card details'));
        }
      });

      expect(result.current.error).toBe('Invalid card details');
    });
  });

  describe('verifyCard', () => {
    it('should verify card successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          valid: true
        })
      });

      const { result } = renderHook(() => usePayment());

      const cardDetails = createMockCardDetails();
      let isValid: boolean;

      await act(async () => {
        isValid = await result.current.verifyCard(cardDetails);
      });

      expect(isValid!).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('/api/verify-card', expect.any(Object));
    });

    it('should handle card verification failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'Card verification failed'
        })
      });

      const { result } = renderHook(() => usePayment());

      await act(async () => {
        try {
          await result.current.verifyCard(createMockCardDetails());
        } catch (error) {
          expect(error).toEqual(new Error('Card verification failed'));
        }
      });

      expect(result.current.error).toBe('Card verification failed');
    });
  });

  describe('reset', () => {
    it('should reset hook state', async () => {
      const { result } = renderHook(() => usePayment());

      // First, set some state
      await act(async () => {
        try {
          await result.current.processPayment({
            amount: 0, // Invalid to trigger error
            currency: 'AUD',
            reference: 'TEST',
            cardDetails: createMockCardDetails()
          });
        } catch (error) {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();

      // Now reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(false);
    });
  });
});

describe('useOAuthPayment', () => {
  it('should create payment hook with OAuth configuration', () => {
    const { result } = renderHook(() => 
      useOAuthPayment('test-token', 'test-username', { enableTokenization: true })
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.success).toBe(false);
    expect(typeof result.current.processPayment).toBe('function');
  });
});

describe('useTokenPayment', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        transaction: {
          id: 'txn-token-123',
          amount: 25.50,
          currency: 'AUD',
          reference: 'TOKEN-REF',
          successful: true
        }
      })
    });
  });

  it('should process token payment successfully', async () => {
    const { result } = renderHook(() => useTokenPayment());

    await act(async () => {
      await result.current.processTokenPayment('card-token-123', 25.50, 'TOKEN-REF');
    });

    expect(result.current.success).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);

    expect(global.fetch).toHaveBeenCalledWith('/api/payments/with-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'card-token-123',
        amount: 25.50,
        reference: 'TOKEN-REF',
        currency: 'AUD',
        customerIp: '127.0.0.1'
      })
    });
  });

  it('should handle token payment failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: jest.fn().mockResolvedValue({
        error: 'Invalid token'
      })
    });

    const { result } = renderHook(() => useTokenPayment());

    await act(async () => {
      try {
        await result.current.processTokenPayment('invalid-token', 25.50, 'TOKEN-REF');
      } catch (error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe('Invalid token');
    expect(result.current.success).toBe(false);
  });

  it('should reset token payment state', () => {
    const { result } = renderHook(() => useTokenPayment());

    act(() => {
      result.current.reset();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.success).toBe(false);
  });
});

describe('usePaymentEvents', () => {
  it('should manage payment events', () => {
    const { result } = renderHook(() => usePaymentEvents());

    expect(result.current.events).toEqual([]);

    act(() => {
      result.current.addEvent({
        type: 'payment_started',
        data: { amount: 10.00 },
        timestamp: 0 // Will be overridden
      });
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].type).toBe('payment_started');
    expect(result.current.events[0].data).toEqual({ amount: 10.00 });
    expect(result.current.events[0].timestamp).toBeTruthy();
  });

  it('should filter events by type', () => {
    const { result } = renderHook(() => usePaymentEvents());

    act(() => {
      result.current.addEvent({
        type: 'payment_started',
        data: { amount: 10.00 },
        timestamp: 0
      });
      result.current.addEvent({
        type: 'payment_completed',
        data: { amount: 10.00 },
        timestamp: 0
      });
      result.current.addEvent({
        type: 'payment_started',
        data: { amount: 20.00 },
        timestamp: 0
      });
    });

    const startedEvents = result.current.getEventsByType('payment_started');
    expect(startedEvents).toHaveLength(2);
    expect(startedEvents.every(e => e.type === 'payment_started')).toBe(true);
  });

  it('should clear all events', () => {
    const { result } = renderHook(() => usePaymentEvents());

    act(() => {
      result.current.addEvent({
        type: 'payment_started',
        data: {},
        timestamp: 0
      });
      result.current.addEvent({
        type: 'payment_completed',
        data: {},
        timestamp: 0
      });
    });

    expect(result.current.events).toHaveLength(2);

    act(() => {
      result.current.clearEvents();
    });

    expect(result.current.events).toHaveLength(0);
  });
});