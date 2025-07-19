import { useState, useCallback, useRef, useEffect } from 'react';
import {
  UsePaymentOptions,
  UsePaymentResult,
  PaymentFormData,
  CardDetails,
  PaymentEvent
} from '../types';

export const usePayment = (options: UsePaymentOptions = {}): UsePaymentResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const {
    enableTokenization = false,
    enable3DS = false,
    accessToken,
    username,
    autoReset = true
  } = options;

  // Store the last transaction ID for potential future operations
  const lastTransactionRef = useRef<string | null>(null);
  const fatZebraSDKRef = useRef<any>(null);

  // Initialize Fat Zebra SDK for 3DS if needed
  useEffect(() => {
    if (enable3DS && accessToken && username) {
      initializeFatZebraSDK();
    }
  }, [enable3DS, accessToken, username]);

  const initializeFatZebraSDK = async () => {
    try {
      const { FatZebra } = await import('@fat-zebra/sdk');
      
      fatZebraSDKRef.current = new FatZebra({
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
        accessToken,
        username
      });

      // Set up event listeners for 3DS
      fatZebraSDKRef.current.on('sca_success', (event: PaymentEvent) => {
        console.log('3DS Authentication successful:', event);
      });

      fatZebraSDKRef.current.on('sca_error', (event: PaymentEvent) => {
        console.error('3DS Authentication failed:', event);
        setError('3D Secure authentication failed');
        setLoading(false);
      });

    } catch (error) {
      console.error('Failed to initialize Fat Zebra SDK:', error);
      setError('Failed to initialize secure payment system');
    }
  };

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setSuccess(false);
    lastTransactionRef.current = null;
  }, []);

  const processPayment = useCallback(async (data: PaymentFormData): Promise<any> => {
    if (loading) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate required data
      if (!data.cardDetails || !data.amount || data.amount <= 0) {
        throw new Error('Invalid payment data provided');
      }

      let paymentResult;

      if (enable3DS && fatZebraSDKRef.current) {
        // Process with 3DS2
        paymentResult = await processPaymentWith3DS(data);
      } else {
        // Standard payment processing
        paymentResult = await processStandardPayment(data);
      }

      // Store transaction ID for future reference
      if (paymentResult.id) {
        lastTransactionRef.current = paymentResult.id;
      }

      setSuccess(true);
      
      // Auto-reset after successful payment if enabled
      if (autoReset) {
        setTimeout(() => {
          reset();
        }, 3000);
      }

      return paymentResult;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
      setError(errorMessage);
      setSuccess(false);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loading, enable3DS, autoReset, reset]);

  const processStandardPayment = async (data: PaymentFormData) => {
    const response = await fetch('/api/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: data.amount,
        currency: data.currency,
        reference: data.reference,
        cardDetails: data.cardDetails,
        customer: data.customer,
        customerIp: getClientIP()
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Payment failed');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Payment was not successful');
    }

    return result.transaction;
  };

  const processPaymentWith3DS = async (data: PaymentFormData) => {
    if (!fatZebraSDKRef.current) {
      throw new Error('3DS authentication system not initialized');
    }

    // First, perform 3DS verification
    const verificationResult = await fatZebraSDKRef.current.verify({
      card: {
        card_holder: data.cardDetails.card_holder,
        card_number: data.cardDetails.card_number.replace(/\s/g, ''),
        card_expiry: data.cardDetails.card_expiry,
        cvv: data.cardDetails.cvv
      },
      amount: data.amount,
      currency: data.currency,
      reference: data.reference || `PAY-${Date.now()}`
    });

    if (!verificationResult.successful) {
      throw new Error(verificationResult.errors?.[0] || '3DS verification failed');
    }

    // If 3DS successful, process the payment
    const response = await fetch('/api/payments/with-3ds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: data.amount,
        currency: data.currency,
        reference: data.reference,
        cardDetails: data.cardDetails,
        customer: data.customer,
        customerIp: getClientIP(),
        verificationData: verificationResult.data
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '3DS payment failed');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || '3DS payment was not successful');
    }

    return result.transaction;
  };

  const tokenizeCard = useCallback(async (cardDetails: CardDetails): Promise<string> => {
    if (loading) {
      throw new Error('Another operation is in progress');
    }

    if (!enableTokenization) {
      throw new Error('Tokenization is not enabled');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tokenize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardDetails: {
            card_holder: cardDetails.card_holder,
            card_number: cardDetails.card_number.replace(/\s/g, ''),
            card_expiry: cardDetails.card_expiry,
            cvv: cardDetails.cvv
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Tokenization failed');
      }

      const result = await response.json();
      
      if (!result.success || !result.token) {
        throw new Error(result.error || 'Tokenization was not successful');
      }

      return result.token;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Tokenization failed';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loading, enableTokenization]);

  const verifyCard = useCallback(async (cardDetails: CardDetails): Promise<boolean> => {
    if (loading) {
      throw new Error('Another operation is in progress');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/verify-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardDetails: {
            card_holder: cardDetails.card_holder,
            card_number: cardDetails.card_number.replace(/\s/g, ''),
            card_expiry: cardDetails.card_expiry,
            cvv: cardDetails.cvv
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Card verification failed');
      }

      const result = await response.json();
      return result.valid === true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Card verification failed';
      setError(errorMessage);
      throw error;
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
};

// Additional specialized hooks

export const useOAuthPayment = (
  accessToken: string,
  username: string,
  options: Omit<UsePaymentOptions, 'accessToken' | 'username'> = {}
): UsePaymentResult => {
  return usePayment({
    ...options,
    accessToken,
    username,
    enable3DS: true // OAuth payments always support 3DS
  });
};

export const useTokenPayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const processTokenPayment = useCallback(async (
    token: string,
    amount: number,
    reference: string,
    currency: string = 'AUD'
  ) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/payments/with-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          amount,
          reference,
          currency,
          customerIp: getClientIP()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Token payment failed');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Token payment was not successful');
      }

      setSuccess(true);
      return result.transaction;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token payment failed';
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setSuccess(false);
  }, []);

  return {
    loading,
    error,
    success,
    processTokenPayment,
    reset
  };
};

export const usePaymentEvents = () => {
  const [events, setEvents] = useState<PaymentEvent[]>([]);

  const addEvent = useCallback((event: PaymentEvent) => {
    setEvents(prev => [...prev, { ...event, timestamp: Date.now() }]);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const getEventsByType = useCallback((type: string) => {
    return events.filter(event => event.type === type);
  }, [events]);

  return {
    events,
    addEvent,
    clearEvents,
    getEventsByType
  };
};

// Utility function to get client IP (best effort)
function getClientIP(): string {
  // This is a placeholder - in a real application, you'd need to
  // implement proper IP detection or pass it from the server
  return '127.0.0.1';
}