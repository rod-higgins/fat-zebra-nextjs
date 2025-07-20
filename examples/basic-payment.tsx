// Basic payment form implementation using the Fat Zebra Next.js library

import React, { useState } from 'react';
import { PaymentForm, usePayment } from '@fwcgovau/fat-zebra-nextjs';
import type { PaymentFormData } from '@fwcgovau/fat-zebra-nextjs';

// Environment variables should be set in .env.local:
// FATZEBRA_USERNAME=your_username
// FATZEBRA_TOKEN=your_token
// FATZEBRA_SHARED_SECRET=your_shared_secret
// NODE_ENV=development

interface BasicPaymentExampleProps {
  orderTotal: number;
  orderReference: string;
}

export const BasicPaymentExample: React.FC<BasicPaymentExampleProps> = ({
  orderTotal,
  orderReference
}) => {
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [transactionId, setTransactionId] = useState<string>('');

  // Use the payment hook for processing
  const { loading, error, success, processPayment, reset } = usePayment();

  const handlePaymentSubmit = async (paymentData: PaymentFormData) => {
    try {
      setPaymentStatus('processing');
      
      // Process the payment
      const result = await processPayment({
        ...paymentData,
        amount: orderTotal,
        reference: orderReference
      });

      // Payment successful
      setTransactionId(result.id);
      setPaymentStatus('success');
      
      console.log('Payment successful:', result);

    } catch (err) {
      setPaymentStatus('error');
      console.error('Payment failed:', err);
    }
  };

  const handleTryAgain = () => {
    reset();
    setPaymentStatus('idle');
    setTransactionId('');
  };

  // Success state
  if (success || paymentStatus === 'success') {
    return (
      <div className="max-w-md mx-auto bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="text-center">
          <div className="text-green-600 text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Payment Successful!</h2>
          <p className="text-green-700 mb-4">
            Your payment of <strong>${orderTotal.toFixed(2)} AUD</strong> has been processed successfully.
          </p>
          {transactionId && (
            <p className="text-sm text-green-600 mb-4">
              Transaction ID: <code className="bg-green-100 px-2 py-1 rounded">{transactionId}</code>
            </p>
          )}
          <p className="text-sm text-green-600">
            Reference: <code className="bg-green-100 px-2 py-1 rounded">{orderReference}</code>
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || paymentStatus === 'error') {
    return (
      <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-800 mb-2">Payment Failed</h2>
          <p className="text-red-700 mb-4">
            {error || 'An error occurred while processing your payment.'}
          </p>
          <button
            onClick={handleTryAgain}
            className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Payment form
  return (
    <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Payment</h2>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Order Total:</span>
            <span className="text-2xl font-bold text-gray-900">${orderTotal.toFixed(2)} AUD</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-gray-600">Reference:</span>
            <span className="text-gray-900 font-mono text-sm">{orderReference}</span>
          </div>
        </div>
      </div>

      <PaymentForm
        onSubmit={handlePaymentSubmit}
        amount={orderTotal}
        currency="AUD"
        loading={loading || paymentStatus === 'processing'}
        className="space-y-4"
        requireCustomer={true}
      />
    </div>
  );
};

// Example with OAuth and 3DS2
export const SecurePaymentExample: React.FC<BasicPaymentExampleProps> = ({
  orderTotal,
  orderReference
}) => {
  const [accessToken, setAccessToken] = useState<string>('');
  const [tokenLoading, setTokenLoading] = useState(false);

  // Generate OAuth token on component mount
  React.useEffect(() => {
    generateOAuthToken();
  }, []);

  const generateOAuthToken = async () => {
    try {
      setTokenLoading(true);
      
      const response = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to generate access token');
      }

      const data = await response.json();
      setAccessToken(data.accessToken);

    } catch (error) {
      console.error('OAuth token generation failed:', error);
    } finally {
      setTokenLoading(false);
    }
  };

  // Use OAuth payment hook with 3DS2
  const { loading, error, success, processPayment } = usePayment({
    enableTokenization: true,
    enable3DS: true,
    accessToken,
    username: process.env.NEXT_PUBLIC_FATZEBRA_USERNAME
  });

  const handleSecurePayment = async (paymentData: PaymentFormData) => {
    try {
      const result = await processPayment({
        ...paymentData,
        amount: orderTotal,
        reference: orderReference
      });

      console.log('Secure payment successful with 3DS:', result);

    } catch (err) {
      console.error('Secure payment failed:', err);
    }
  };

  const handleTokenizationSuccess = (token: string) => {
    console.log('Card tokenized successfully:', token);
    // Store token for future use
  };

  const handleScaSuccess = (event: any) => {
    console.log('3DS authentication successful:', event);
  };

  const handleScaError = (error: any) => {
    console.error('3DS authentication failed:', error);
  };

  if (tokenLoading) {
    return (
      <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing secure payment system...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="text-center">
          <div className="text-green-600 text-6xl mb-4">🔒✅</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Secure Payment Complete!</h2>
          <p className="text-green-700 mb-4">
            Your payment was processed securely with 3D Secure authentication.
          </p>
          <p className="text-sm text-green-600">
            Amount: <strong>${orderTotal.toFixed(2)} AUD</strong>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Secure Payment</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center">
            <span className="text-blue-600 mr-2">🔒</span>
            <span className="text-blue-800 text-sm">
              This payment is protected by 3D Secure authentication
            </span>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Order Total:</span>
            <span className="text-2xl font-bold text-gray-900">${orderTotal.toFixed(2)} AUD</span>
          </div>
        </div>
      </div>

      <PaymentForm
        onSubmit={handleSecurePayment}
        amount={orderTotal}
        currency="AUD"
        loading={loading}
        enableTokenization={true}
        enable3DS={true}
        accessToken={accessToken}
        username={process.env.NEXT_PUBLIC_FATZEBRA_USERNAME}
        onTokenizationSuccess={handleTokenizationSuccess}
        onScaSuccess={handleScaSuccess}
        onScaError={handleScaError}
        requireCustomer={true}
        className="space-y-4"
      />

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

// Example usage in a Next.js page
export default function PaymentPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Payment Examples</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Basic Payment</h2>
            <BasicPaymentExample
              orderTotal={99.95}
              orderReference="ORD-2025-001"
            />
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Secure Payment (3DS2 + OAuth)</h2>
            <SecurePaymentExample
              orderTotal={199.95}
              orderReference="ORD-2025-002"
            />
          </div>
        </div>
      </div>
    </div>
  );
}