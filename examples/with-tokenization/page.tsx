'use client';

import React, { useState, useEffect } from 'react';
import { PaymentForm, useOAuthPayment } from '@fwc/fat-zebra-nextjs';

export default function TokenizationExample() {
  const [accessToken, setAccessToken] = useState<string>('');
  const [username, setUsername] = useState<string>('');

  const { loading, error, success, processPayment, reset } = useOAuthPayment(
    accessToken,
    username,
    {
      enableTokenization: true,
      enable3DS: true
    }
  );

  // Get OAuth token on component mount
  useEffect(() => {
    const getOAuthToken = async () => {
      try {
        const response = await fetch('/api/fat-zebra/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ scope: 'payment' })
        });

        if (response.ok) {
          const { access_token } = await response.json();
          setAccessToken(access_token);
          setUsername(process.env.NEXT_PUBLIC_FATZEBRA_USERNAME || '');
        }
      } catch (error) {
        console.error('Failed to get OAuth token:', error);
      }
    };

    getOAuthToken();
  }, []);

  const handlePayment = async (paymentData: any) => {
    try {
      await processPayment(paymentData);
    } catch (error) {
      console.error('Payment failed:', error);
    }
  };

  const handleTokenizationSuccess = (token: string) => {
    console.log('Card tokenized successfully:', token);
    // Store token securely for future use
  };

  const handleScaSuccess = (event: any) => {
    console.log('3DS authentication successful:', event);
  };

  const handleScaError = (error: any) => {
    console.error('3DS authentication failed:', error);
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="text-center">
          <div className="text-green-600 text-2xl mb-2">✅</div>
          <h2 className="text-xl font-semibold text-green-800 mb-2">Payment & Tokenization Complete!</h2>
          <p className="text-green-700 mb-4">
            Your payment has been processed and card has been securely tokenized for future use.
          </p>
          <button
            onClick={reset}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
          >
            Make Another Payment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        Secure Payment with Tokenization
      </h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Premium Subscription</h2>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Monthly Plan</span>
            <span className="font-medium">AUD $49.99</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Your card will be securely tokenized for future recurring payments.
          </p>
        </div>

        {accessToken ? (
          <PaymentForm
            onSubmit={handlePayment}
            amount={49.99}
            currency="AUD"
            loading={loading}
            enableTokenization={true}
            enable3DS={true}
            accessToken={accessToken}
            username={username}
            onTokenizationSuccess={handleTokenizationSuccess}
            onScaSuccess={handleScaSuccess}
            onScaError={handleScaError}
            requireCustomer={true}
            className="space-y-4"
          />
        ) : (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Initializing secure payment...</p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-600 text-sm">{error}</div>
          </div>
        )}

        <div className="mt-6 text-xs text-gray-500">
          <p>🔒 Your payment information is encrypted and secure</p>
          <p>🛡️ 3D Secure authentication enabled</p>
          <p>💳 Card details will be tokenized for security</p>
        </div>
      </div>
    </div>
  );
}