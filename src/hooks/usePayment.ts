import { useState, useCallback, useRef } from 'react';
import { 
  PaymentFormData, 
  UsePaymentOptions, 
  UsePaymentResult, 
  CardDetails,
  FatZebraResponse,
  TransactionResponse
} from '../types';
import { FatZebraError } from '../lib/client';

/**
 * Custom hook for handling Fat Zebra payments
 */
export function usePayment(options: UsePaymentOptions = {}): UsePaymentResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setSuccess(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const processPayment = useCallback(async (data: PaymentFormData): Promise<any> => {
    if (loading) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    // Create abort controller for request cancellation
    abortControllerRef.current = new AbortController();

    try {
      const requestData = {
        amount: data.amount,
        currency: data.currency || 'AUD',
        reference: data.reference || `ORDER-${Date.now()}`,
        card_details: data.cardDetails,
        customer: data.customer,
        customer_ip: typeof window !== 'undefined' 
          ? await getClientIpAddress() 
          : undefined,
        metadata: {
          source: '@fwc/fat-zebra-nextjs',
          timestamp: new Date().toISOString()
        }
      };

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new FatZebraError(
          errorData.message || 'Payment failed',
          errorData.errors || [],
          response.status.toString()
        );
      }

      const result = await response.json();
      
      if (!result.successful) {
        throw new FatZebraError(
          result.message || 'Payment failed',
          result.errors || ['Transaction was not successful']
        );
      }

      setSuccess(true);
      
      if (options.autoReset) {
        setTimeout(reset, 3000);
      }

      return result;

    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // Request was cancelled, don't update state
        return;
      }

      const errorMessage = error instanceof FatZebraError 
        ? error.message 
        : error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred';

      setError(errorMessage);
      
      if (options.autoReset) {
        setTimeout(() => setError(null), 5000);
      }

      throw error;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [loading, options.autoReset, reset]);

  const tokenizeCard = useCallback(async (cardDetails: CardDetails): Promise<string> => {
    if (loading) return '';

    setLoading(true);
    setError(null);

    try {
      // Generate verification hash if needed
      let verificationHash: string | undefined;
      
      if (options.enableTokenization) {
        const hashResponse = await fetch('/api/generate-verification-hash', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reference: `TOKEN-${Date.now()}`,
            amount: 0,
            currency: 'AUD'
          })
        });

        if (hashResponse.ok) {
          const hashData = await hashResponse.json();
          verificationHash = hashData.hash;
        }
      }

      const requestData = {
        ...cardDetails,
        verification: verificationHash
      };

      const response = await fetch('/api/tokenize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new FatZebraError(
          errorData.message || 'Tokenization failed',
          errorData.errors || []
        );
      }

      const result = await response.json();
      
      if (!result.successful) {
        throw new FatZebraError(
          'Tokenization failed',
          result.errors || ['Token creation was not successful']
        );
      }

      return result.response.token;

    } catch (error) {
      const errorMessage = error instanceof FatZebraError 
        ? error.message 
        : error instanceof Error 
        ? error.message 
        : 'Tokenization failed';

      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loading, options.enableTokenization]);

  const verifyCard = useCallback(async (cardDetails: CardDetails): Promise<boolean> => {
    if (loading) return false;

    setLoading(true);
    setError(null);

    try {
      const requestData = {
        amount: 1, // $0.01 for verification
        currency: 'AUD',
        reference: `VERIFY-${Date.now()}`,
        card_details: cardDetails,
        capture: false // Authorization only
      };

      const response = await fetch('/api/verify-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new FatZebraError(
          errorData.message || 'Card verification failed',
          errorData.errors || []
        );
      }

      const result = await response.json();
      return result.successful;

    } catch (error) {
      const errorMessage = error instanceof FatZebraError 
        ? error.message 
        : error instanceof Error 
        ? error.message 
        : 'Card verification failed';

      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  return {
    loading,
    error,
    success,
    processPayment,
    tokenizeCard,
    verifyCard,
    reset
  };
}

/**
 * Get client IP address for fraud detection
 */
async function getClientIpAddress(): Promise<string | undefined> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    // Fallback to undefined if IP detection fails
    return undefined;
  }
}

/**
 * OAuth-enabled payment hook
 */
export function useOAuthPayment(
  accessToken: string,
  username: string,
  options: UsePaymentOptions = {}
): UsePaymentResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setSuccess(false);
  }, []);

  const processPayment = useCallback(async (data: PaymentFormData): Promise<any> => {
    if (loading || !accessToken) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Use client-side SDK with OAuth token
      if (typeof window !== 'undefined') {
        const { Client } = await import('@fat-zebra/sdk');
        
        const client = new Client({
          accessToken,
          username,
          environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
        });

        const result = await client.purchases.create({
          amount: data.amount,
          currency: data.currency || 'AUD',
          reference: data.reference || `ORDER-${Date.now()}`,
          card_details: data.cardDetails,
          customer: data.customer
        });

        if (!result.successful) {
          throw new FatZebraError(
            result.response?.message || 'Payment failed',
            result.errors || []
          );
        }

        setSuccess(true);
        
        if (options.autoReset) {
          setTimeout(reset, 3000);
        }

        return result;
      }

    } catch (error) {
      const errorMessage = error instanceof FatZebraError 
        ? error.message 
        : error instanceof Error 
        ? error.message 
        : 'Payment failed';

      setError(errorMessage);
      
      if (options.autoReset) {
        setTimeout(() => setError(null), 5000);
      }

      throw error;
    } finally {
      setLoading(false);
    }
  }, [loading, accessToken, username, options.autoReset, reset]);

  const tokenizeCard = useCallback(async (cardDetails: CardDetails): Promise<string> => {
    if (loading || !accessToken) return '';

    setLoading(true);
    setError(null);

    try {
      if (typeof window !== 'undefined') {
        const { Client } = await import('@fat-zebra/sdk');
        
        const client = new Client({
          accessToken,
          username,
          environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
        });

        const result = await client.cards.create(cardDetails);

        if (!result.successful) {
          throw new FatZebraError(
            'Tokenization failed',
            result.errors || []
          );
        }

        return result.response.token;
      }

      return '';

    } catch (error) {
      const errorMessage = error instanceof FatZebraError 
        ? error.message 
        : error instanceof Error 
        ? error.message 
        : 'Tokenization failed';

      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loading, accessToken, username]);

  const verifyCard = useCallback(async (cardDetails: CardDetails): Promise<boolean> => {
    if (loading || !accessToken) return false;

    setLoading(true);
    setError(null);

    try {
      if (typeof window !== 'undefined') {
        const { Client } = await import('@fat-zebra/sdk');
        
        const client = new Client({
          accessToken,
          username,
          environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
        });

        const result = await client.purchases.create({
          amount: 1,
          currency: 'AUD',
          reference: `VERIFY-${Date.now()}`,
          card_details: cardDetails,
          capture: false
        });

        return result.successful;
      }

      return false;

    } catch (error) {
      const errorMessage = error instanceof FatZebraError 
        ? error.message 
        : error instanceof Error 
        ? error.message 
        : 'Card verification failed';

      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loading, accessToken, username]);

  return {
    loading,
    error,
    success,
    processPayment,
    tokenizeCard,
    verifyCard,
    reset
  };
}

/**
 * Hook for handling payment events and SDK integration
 */
export function usePaymentEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [lastEvent, setLastEvent] = useState<any | null>(null);

  const createHandlers = useCallback(() => {
    return {
      onSuccess: (event: any) => {
        setLastEvent(event);
        setEvents(prev => [...prev, { type: 'success', data: event, timestamp: Date.now() }]);
      },
      onError: (event: any) => {
        setLastEvent(event);
        setEvents(prev => [...prev, { type: 'error', data: event, timestamp: Date.now() }]);
      },
      onCancel: (event: any) => {
        setLastEvent(event);
        setEvents(prev => [...prev, { type: 'cancel', data: event, timestamp: Date.now() }]);
      },
      onTokenizationSuccess: (event: any) => {
        setLastEvent(event);
        setEvents(prev => [...prev, { type: 'tokenization_success', data: event, timestamp: Date.now() }]);
      },
      onScaSuccess: (event: any) => {
        setLastEvent(event);
        setEvents(prev => [...prev, { type: 'sca_success', data: event, timestamp: Date.now() }]);
      },
      onScaError: (event: any) => {
        setLastEvent(event);
        setEvents(prev => [...prev, { type: 'sca_error', data: event, timestamp: Date.now() }]);
      }
    };
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  return {
    events,
    lastEvent,
    createHandlers,
    clearEvents
  };
}