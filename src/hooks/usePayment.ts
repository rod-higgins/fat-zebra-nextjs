'use client';

import { useState, useCallback, useRef } from 'react';
import { 
  Environment,
  PaymentConfig,
  PublicEvent,
  Handlers
} from '@fat-zebra/sdk/dist';
import type { 
  PaymentFormData, 
  PaymentHookResult, 
  UsePaymentOptions,
  CardDetails,
  FatZebraError 
} from '../types';

export function usePayment(options: UsePaymentOptions = {}): PaymentHookResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const tokenRef = useRef<string | null>(null);
  const scaCompletedRef = useRef<boolean>(false);

  const {
    enableTokenization = false,
    enable3DS = true,
    accessToken,
    username
  } = options;

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setSuccess(false);
    tokenRef.current = null;
    scaCompletedRef.current = false;
  }, []);

  const generateVerificationHash = async (
    reference: string, 
    amount: number, 
    currency: string
  ): Promise<string> => {
    try {
      const response = await fetch('/api/generate-verification-hash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reference, amount, currency })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate verification hash: ${response.statusText}`);
      }

      const data = await response.json();
      return data.hash;
    } catch (err) {
      throw new Error(`Verification hash generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const tokenizeCard = useCallback(async (cardData: CardDetails): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      if (!accessToken) {
        throw new Error('Access token is required for tokenization');
      }

      // Generate a temporary reference for tokenization
      const reference = `TOKENIZE-${Date.now()}`;
      const amount = 1; // Minimal amount for tokenization
      const currency = 'AUD';

      const verificationHash = await generateVerificationHash(reference, amount, currency);

      const response = await fetch('/api/tokenize-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardDetails: cardData,
          verification: verificationHash,
          reference,
          amount,
          currency,
          accessToken,
          username
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Tokenization failed');
      }

      const result = await response.json();
      tokenRef.current = result.token;
      return result.token;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Tokenization failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [accessToken, username]);

  const verifyCard = useCallback(async (cardToken: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      if (!accessToken) {
        throw new Error('Access token is required for card verification');
      }

      const response = await fetch('/api/verify-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardToken,
          accessToken,
          username
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Card verification failed');
      }

      const result = await response.json();
      return result.verified;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Card verification failed';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [accessToken, username]);

  const processPayment = useCallback(async (paymentData: PaymentFormData): Promise<any> => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // If tokenization is enabled and we have the required config
      if (enableTokenization && accessToken && username) {
        // First, tokenize the card with 3DS if enabled
        const token = await tokenizeCard(paymentData.cardDetails);
        
        // If 3DS is enabled, we need to wait for SCA completion
        if (enable3DS) {
          // This would typically be handled by the SDK components
          // For now, we'll proceed with the assumption that 3DS completed successfully
          scaCompletedRef.current = true;
        }

        // Process payment with token
        const response = await fetch('/api/payments/with-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            amount: paymentData.amount,
            currency: paymentData.currency,
            reference: paymentData.reference,
            customer: paymentData.customer
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Payment processing failed');
        }

        const result = await response.json();
        setSuccess(true);
        return result;
      } else {
        // Traditional payment processing
        const response = await fetch('/api/payments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Payment processing failed');
        }

        const result = await response.json();
        setSuccess(true);
        return result;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [enableTokenization, enable3DS, accessToken, username, tokenizeCard]);

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
 * Enhanced hook for handling OAuth-based payments with 3DS2
 */
export function useOAuthPayment(
  accessToken: string,
  username: string,
  options: Omit<UsePaymentOptions, 'accessToken' | 'username'> = {}
) {
  return usePayment({
    ...options,
    accessToken,
    username
  });
}

/**
 * Hook for handling payment events from the Fat Zebra SDK
 */
export function usePaymentEvents() {
  const [events, setEvents] = useState<Array<any>>([]);
  const [lastEvent, setLastEvent] = useState<any>(null);

  const addEvent = useCallback((event: any) => {
    setEvents(prev => [...prev, event]);
    setLastEvent(event);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  const createHandlers = useCallback((): Handlers => ({
    [PublicEvent.FORM_VALIDATION_ERROR]: addEvent,
    [PublicEvent.FORM_VALIDATION_SUCCESS]: addEvent,
    [PublicEvent.TOKENIZATION_SUCCESS]: addEvent,
    [PublicEvent.TOKENIZATION_ERROR]: addEvent,
    [PublicEvent.SCA_SUCCESS]: addEvent,
    [PublicEvent.SCA_ERROR]: addEvent,
    [PublicEvent.SCA_CHALLENGE]: addEvent,
  }), [addEvent]);

  return {
    events,
    lastEvent,
    addEvent,
    clearEvents,
    createHandlers
  };
}

/**
 * Hook for managing payment configuration
 */
export function usePaymentConfig(
  username: string,
  accessToken: string,
  environment: Environment = Environment.sandbox
): PaymentConfig {
  return {
    username,
    environment,
    accessToken,
    paymentIntent: {
      payment: {
        reference: '',
        amount: 0,
        currency: 'AUD'
      },
      verification: ''
    },
    options: {
      sca_enabled: true,
    }
  };
}