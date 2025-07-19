'use client';

import React from 'react';
import { PaymentForm, usePayment } from '@fwc/fat-zebra-nextjs';

export default function BasicCheckoutPage() {
  const { loading, error, success, processPayment, reset } = usePayment();

  const handlePayment = async (paymentData: any) => {
    try {
      await processPayment(paymentData);
    } catch (error) {
      console.error('Payment failed:', error);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
        <div className="text-center">
          <div className="text-green-600 text-2xl mb-2">✅</div>
          <h2 className="text-xl font-semibold text-green-800 mb-2">Payment Successful!</h2>
          <p className="text-green-700 mb-4">Your payment has been processed successfully.</p>
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Checkout</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Order Summary</h2>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Premium Widget</span>
            <span className="font-medium">AUD $25.00</span>
          </div>
        </div>

        <PaymentForm
          onSubmit={handlePayment}
          amount={25.00}
          currency="AUD"
          loading={loading}
          requireCustomer={true}
          className="space-y-4"
        />

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-600 text-sm">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
}