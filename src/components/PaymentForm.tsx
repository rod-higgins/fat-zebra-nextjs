'use client';

import React, { useState } from 'react';
import { validateCard, formatCardExpiry } from '../utils';
import type { CardDetails, PaymentFormData } from '../types';

interface PaymentFormProps {
  onSubmit: (paymentData: PaymentFormData) => Promise<void>;
  loading?: boolean;
  currency?: string;
  amount?: number;
  enableTokenization?: boolean;
  onTokenizationSuccess?: (token: string) => void;
}

export function PaymentForm({ 
  onSubmit, 
  loading = false, 
  currency = 'AUD', 
  amount,
  enableTokenization = false,
  onTokenizationSuccess
}: PaymentFormProps) {
  const [formData, setFormData] = useState({
    card_holder: '',
    card_number: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
    amount: amount || 0,
    reference: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cardType, setCardType] = useState<string>('');

  const handleCardNumberChange = (value: string) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
    }
    
    if (formData.amount <= 0) {
      validationErrors.amount = 'Amount must be greater than 0';
    }
    
    if (!formData.reference.trim()) {
      validationErrors.reference = 'Reference is required';
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    const paymentData: PaymentFormData = {
      amount: Math.round(formData.amount * 100),
      cardDetails: {
        card_holder: formData.card_holder,
        card_number: formData.card_number,
        card_expiry: formatCardExpiry(formData.expiry_month, formData.expiry_year),
        cvv: formData.cvv
      },
      reference: formData.reference
    };
    
    try {
      await onSubmit(paymentData);
    } catch (error) {
      console.error('Payment submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Card Holder Name
        </label>
        <input
          type="text"
          value={formData.card_holder}
          onChange={(e) => setFormData(prev => ({ ...prev, card_holder: e.target.value }))}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="John Smith"
          disabled={loading}
        />
        {errors.card_holder && <p className="text-red-500 text-sm mt-1">{errors.card_holder}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Card Number {cardType && <span className="text-gray-500">({cardType})</span>}
        </label>
        <input
          type="text"
          value={formData.card_number}
          onChange={(e) => handleCardNumberChange(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="4111 1111 1111 1111"
          maxLength={19}
          disabled={loading}
        />
        {errors.card_number && <p className="text-red-500 text-sm mt-1">{errors.card_number}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Month
          </label>
          <select
            value={formData.expiry_month}
            onChange={(e) => setFormData(prev => ({ ...prev, expiry_month: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
            <option value="">MM</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <option key={month} value={month.toString().padStart(2, '0')}>
                {month.toString().padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Year
          </label>
          <select
            value={formData.expiry_year}
            onChange={(e) => setFormData(prev => ({ ...prev, expiry_year: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          >
            <option value="">YYYY</option>
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CVV
          </label>
          <input
            type="text"
            value={formData.cvv}
            onChange={(e) => setFormData(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="123"
            maxLength={4}
            disabled={loading}
          />
        </div>
      </div>
      {errors.expiry && <p className="text-red-500 text-sm mt-1">{errors.expiry}</p>}
      {errors.cvv && <p className="text-red-500 text-sm mt-1">{errors.cvv}</p>}

      {!amount && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount ({currency})
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="10.00"
            disabled={loading}
          />
          {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reference
        </label>
        <input
          type="text"
          value={formData.reference}
          onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Order #12345"
          disabled={loading}
        />
        {errors.reference && <p className="text-red-500 text-sm mt-1">{errors.reference}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-2 px-4 rounded-md font-medium ${
          loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
        } text-white transition-colors`}
      >
        {loading ? 'Processing...' : `Pay ${currency} ${(amount || formData.amount).toFixed(2)}`}
      </button>
    </form>
  );
}
