'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Environment,
  Payment,
  PaymentIntent,
  PublicEvent,
  PaymentConfig,
  Handlers,
} from '@fat-zebra/sdk/dist';
import { VerifyCard } from '@fat-zebra/sdk/dist/react';
import { validateCard, formatCardExpiry, formatCardNumber } from '../utils';
import type { CardDetails, PaymentFormData, PaymentFormProps } from '../types';

export function PaymentForm({ 
  onSubmit, 
  loading = false, 
  currency = 'AUD', 
  amount,
  enableTokenization = false,
  enable3DS = true,
  onTokenizationSuccess,
  onScaSuccess,
  onScaError,
  className = '',
  accessToken,
  username
}: PaymentFormProps) {
  const [formData, setFormData] = useState({
    card_holder: '',
    card_number: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
    amount: amount || 0,
    reference: `ORDER-${Date.now()}`
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cardType, setCardType] = useState<string>('');
  const [tokenizationMode, setTokenizationMode] = useState(false);
  const [events, setEvents] = useState<Array<any>>([]);
  const [verificationHash, setVerificationHash] = useState<string>('');

  // Generate verification hash when form data changes
  useEffect(() => {
    if (enableTokenization && accessToken && formData.reference && formData.amount > 0) {
      // This should be generated server-side in production
      // Here we're showing the client-side integration pattern
      generateVerificationHash();
    }
  }, [formData.reference, formData.amount, enableTokenization, accessToken]);

  const generateVerificationHash = async () => {
    try {
      const response = await fetch('/api/generate-verification-hash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference: formData.reference,
          amount: formData.amount,
          currency: currency
        })
      });
      
      const data = await response.json();
      if (data.hash) {
        setVerificationHash(data.hash);
      }
    } catch (error) {
      console.error('Failed to generate verification hash:', error);
    }
  };

  const addEvent = useCallback((event: any) => {
    setEvents((prev) => [...prev, event]);
  }, []);

  const handleCardNumberChange = (value: string) => {
    const formatted = formatCardNumber(value);
    const cleaned = value.replace(/\D/g, '');
    const validation = validateCard(cleaned);
    
    setFormData(prev => ({ ...prev, card_number: cleaned }));
    setCardType(validation.type || '');
    
    if (cleaned && !validation.isValid) {
      setErrors(prev => ({ ...prev, card_number: 'Invalid card number' }));
    } else {
      setErrors(prev => ({ ...prev, card_number: '' }));
    }
  };

  const handleExpiryChange = (value: string) => {
    const formatted = formatCardExpiry(value);
    const [month, year] = formatted.split('/');
    
    setFormData(prev => ({ 
      ...prev, 
      expiry_month: month || '',
      expiry_year: year || ''
    }));
    
    if (formatted && (month && year)) {
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      
      if (parseInt(year) < currentYear || 
          (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
        setErrors(prev => ({ ...prev, expiry: 'Card has expired' }));
      } else {
        setErrors(prev => ({ ...prev, expiry: '' }));
      }
    }
  };

  const validateForm = (): boolean => {
    const validationErrors: Record<string, string> = {};
    
    if (!formData.card_holder.trim()) {
      validationErrors.card_holder = 'Card holder name is required';
    }
    
    if (!formData.card_number) {
      validationErrors.card_number = 'Card number is required';
    } else {
      const validation = validateCard(formData.card_number);
      if (!validation.isValid) {
        validationErrors.card_number = 'Invalid card number';
      }
    }
    
    if (!formData.expiry_month || !formData.expiry_year) {
      validationErrors.expiry = 'Expiry date is required';
    }
    
    if (!formData.cvv) {
      validationErrors.cvv = 'CVV is required';
    } else if (formData.cvv.length < 3) {
      validationErrors.cvv = 'CVV must be at least 3 digits';
    }
    
    if (!amount && formData.amount <= 0) {
      validationErrors.amount = 'Amount must be greater than 0';
    }
    
    if (!formData.reference.trim()) {
      validationErrors.reference = 'Reference is required';
    }
    
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleTokenizationSuccess = useCallback((event: any) => {
    addEvent(event);
    const token = event.detail?.token || event.token;
    if (token && onTokenizationSuccess) {
      onTokenizationSuccess(token);
    }
  }, [addEvent, onTokenizationSuccess]);

  const handleScaSuccess = useCallback((event: any) => {
    addEvent(event);
    if (onScaSuccess) {
      onScaSuccess(event);
    }
  }, [addEvent, onScaSuccess]);

  const handleScaError = useCallback((event: any) => {
    addEvent(event);
    if (onScaError) {
      onScaError(event);
    }
  }, [addEvent, onScaError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // If tokenization is enabled and we have the required config, use SDK
    if (enableTokenization && accessToken && username && verificationHash) {
      setTokenizationMode(true);
      return;
    }

    // Otherwise, proceed with traditional form submission
    const paymentData: PaymentFormData = {
      amount: amount || formData.amount,
      currency,
      reference: formData.reference,
      cardDetails: {
        card_holder: formData.card_holder,
        card_number: formData.card_number,
        card_expiry: `${formData.expiry_month}/${formData.expiry_year}`,
        cvv: formData.cvv
      }
    };

    try {
      await onSubmit(paymentData);
    } catch (error) {
      console.error('Payment submission failed:', error);
    }
  };

  // SDK Configuration for tokenization
  const payment: Payment = {
    reference: formData.reference,
    amount: amount || formData.amount,
    currency: currency,
  };

  const paymentIntent: PaymentIntent = {
    payment,
    verification: verificationHash,
  };

  const config: PaymentConfig = {
    username: username || 'TEST',
    environment: process.env.NODE_ENV === 'production' ? Environment.production : Environment.sandbox,
    accessToken: accessToken || '',
    paymentIntent: paymentIntent,
    options: {
      sca_enabled: enable3DS,
    },
  };

  const handlers: Handlers = {
    [PublicEvent.FORM_VALIDATION_ERROR]: addEvent,
    [PublicEvent.FORM_VALIDATION_SUCCESS]: addEvent,
    [PublicEvent.TOKENIZATION_SUCCESS]: handleTokenizationSuccess,
    [PublicEvent.SCA_SUCCESS]: handleScaSuccess,
    [PublicEvent.SCA_ERROR]: handleScaError,
  };

  // If in tokenization mode and we have all required config, show SDK component
  if (tokenizationMode && accessToken && username && verificationHash) {
    return (
      <div className={`fat-zebra-payment-form ${className}`}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Secure Payment</h3>
          <p className="text-sm text-gray-600">
            Amount: {currency} {(amount || formData.amount).toFixed(2)}
          </p>
          <p className="text-sm text-gray-600">
            Reference: {formData.reference}
          </p>
        </div>
        
        <VerifyCard
          handlers={handlers}
          config={config}
          iframeProps={{ width: "100%", height: "500px" }}
        />
        
        {events.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">Payment Events:</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {events.map((event, index) => (
                <div key={index} className="text-xs text-gray-600">
                  {event.type || event.name || JSON.stringify(event)}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <button
          type="button"
          onClick={() => setTokenizationMode(false)}
          className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          ← Back to manual entry
        </button>
      </div>
    );
  }

  // Traditional form UI
  return (
    <form onSubmit={handleSubmit} className={`fat-zebra-payment-form ${className}`}>
      <div className="space-y-4">
        {/* Card Holder Name */}
        <div>
          <label htmlFor="card_holder" className="block text-sm font-medium text-gray-700 mb-1">
            Card Holder Name
          </label>
          <input
            type="text"
            id="card_holder"
            value={formData.card_holder}
            onChange={(e) => setFormData(prev => ({ ...prev, card_holder: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.card_holder ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="John Doe"
            disabled={loading}
          />
          {errors.card_holder && (
            <p className="mt-1 text-sm text-red-600">{errors.card_holder}</p>
          )}
        </div>

        {/* Card Number */}
        <div>
          <label htmlFor="card_number" className="block text-sm font-medium text-gray-700 mb-1">
            Card Number
          </label>
          <div className="relative">
            <input
              type="text"
              id="card_number"
              value={formatCardNumber(formData.card_number)}
              onChange={(e) => handleCardNumberChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.card_number ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="4111 1111 1111 1111"
              maxLength={19}
              disabled={loading}
            />
            {cardType && (
              <div className="absolute right-2 top-2">
                <span className="text-xs text-gray-500 uppercase">{cardType}</span>
              </div>
            )}
          </div>
          {errors.card_number && (
            <p className="mt-1 text-sm text-red-600">{errors.card_number}</p>
          )}
        </div>

        {/* Expiry and CVV */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="expiry" className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date
            </label>
            <input
              type="text"
              id="expiry"
              value={`${formData.expiry_month}${formData.expiry_year ? '/' + formData.expiry_year : ''}`}
              onChange={(e) => handleExpiryChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.expiry ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="MM/YY"
              maxLength={5}
              disabled={loading}
            />
            {errors.expiry && (
              <p className="mt-1 text-sm text-red-600">{errors.expiry}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">
              CVV
            </label>
            <input
              type="text"
              id="cvv"
              value={formData.cvv}
              onChange={(e) => setFormData(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.cvv ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="123"
              maxLength={4}
              disabled={loading}
            />
            {errors.cvv && (
              <p className="mt-1 text-sm text-red-600">{errors.cvv}</p>
            )}
          </div>
        </div>

        {/* Amount (if not provided as prop) */}
        {!amount && (
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount ({currency})
            </label>
            <input
              type="number"
              id="amount"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.amount ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="10.00"
              min="0.01"
              step="0.01"
              disabled={loading}
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
            )}
          </div>
        )}

        {/* Reference */}
        <div>
          <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-1">
            Reference
          </label>
          <input
            type="text"
            id="reference"
            value={formData.reference}
            onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.reference ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="ORDER-12345"
            disabled={loading}
          />
          {errors.reference && (
            <p className="mt-1 text-sm text-red-600">{errors.reference}</p>
          )}
        </div>

        {/* Tokenization Option */}
        {enableTokenization && accessToken && username && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setTokenizationMode(true)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Use secure tokenization with 3D Secure
            </button>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className={`w-full mt-6 py-3 px-4 rounded-md font-medium transition-colors ${
          loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
        } text-white`}
      >
        {loading ? 'Processing...' : `Pay ${currency} ${(amount || formData.amount).toFixed(2)}`}
      </button>
    </form>
  );
}

export type { PaymentFormProps };