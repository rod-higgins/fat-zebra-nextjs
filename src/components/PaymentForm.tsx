'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Environment,
  Payment,
  PaymentIntent,
  PublicEvent,
  PaymentConfig,
  Handlers,
} from '@fat-zebra/sdk/dist';
import { VerifyCard } from '@fat-zebra/sdk/dist/react';
import { 
  validateCard, 
  formatCardExpiry, 
  formatCardNumber, 
  detectCardType,
  validateEmail,
  formatCurrency,
  generateReference
} from '../utils';
import type { 
  CardDetails, 
  PaymentFormData, 
  PaymentFormProps, 
  PaymentFormErrors,
  CardType 
} from '../types';

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
  username,
  showAmountField = !amount,
  requireCustomer = false
}: PaymentFormProps) {
  const [formData, setFormData] = useState({
    card_holder: '',
    card_number: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
    amount: amount || 0,
    reference: generateReference(),
    email: '',
    first_name: '',
    last_name: '',
    phone: ''
  });

  const [errors, setErrors] = useState<PaymentFormErrors>({});
  const [cardType, setCardType] = useState<CardType>('unknown');
  const [tokenizationMode, setTokenizationMode] = useState(false);
  const [events, setEvents] = useState<Array<any>>([]);
  const [verificationHash, setVerificationHash] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  const formRef = useRef<HTMLFormElement>(null);
  const scaCompletedRef = useRef(false);

  // Generate verification hash when form data changes
  useEffect(() => {
    if (enableTokenization && accessToken && formData.reference && formData.amount > 0) {
      generateVerificationHash();
    }
  }, [formData.reference, formData.amount, enableTokenization, accessToken]);

  // Detect card type on card number change
  useEffect(() => {
    const type = detectCardType(formData.card_number);
    setCardType(type);
  }, [formData.card_number]);

  const generateVerificationHash = async () => {
    try {
      const response = await fetch('/api/fat-zebra/verification-hash', {
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

      if (response.ok) {
        const { hash } = await response.json();
        setVerificationHash(hash);
      }
    } catch (error) {
      console.error('Failed to generate verification hash:', error);
    }
  };

  const validateForm = useCallback((): boolean => {
    const newErrors: PaymentFormErrors = {};
    
    // Card holder validation
    if (!formData.card_holder.trim()) {
      newErrors.card_holder = 'Card holder name is required';
    } else if (formData.card_holder.trim().length < 2) {
      newErrors.card_holder = 'Card holder name must be at least 2 characters';
    }

    // Card number validation
    const cardValidation = validateCard(formData.card_number);
    if (!cardValidation.isValid) {
      newErrors.card_number = cardValidation.errors[0] || 'Invalid card number';
    }

    // Expiry validation
    if (!formData.expiry_month || !formData.expiry_year) {
      newErrors.card_expiry = 'Expiry date is required';
    } else {
      const now = new Date();
      const currentYear = now.getFullYear() % 100;
      const currentMonth = now.getMonth() + 1;
      const expMonth = parseInt(formData.expiry_month);
      const expYear = parseInt(formData.expiry_year);

      if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
        newErrors.card_expiry = 'Card has expired';
      }
    }

    // CVV validation
    if (!formData.cvv) {
      newErrors.cvv = 'CVV is required';
    } else if (!/^\d{3,4}$/.test(formData.cvv)) {
      newErrors.cvv = 'CVV must be 3 or 4 digits';
    }

    // Amount validation
    if (showAmountField && (!formData.amount || formData.amount <= 0)) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    // Customer validation if required
    if (requireCustomer) {
      if (!formData.email) {
        newErrors.email = 'Email is required';
      } else if (!validateEmail(formData.email)) {
        newErrors.email = 'Invalid email address';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, showAmountField, requireCustomer]);

  const handleInputChange = (field: string, value: string) => {
    let processedValue = value;

    // Format specific fields
    switch (field) {
      case 'card_number':
        processedValue = formatCardNumber(value);
        break;
      case 'card_expiry':
        processedValue = formatCardExpiry(value);
        const [month, year] = processedValue.split('/');
        setFormData(prev => ({ 
          ...prev, 
          expiry_month: month || '', 
          expiry_year: year || '' 
        }));
        return;
      case 'cvv':
        processedValue = value.replace(/\D/g, '').slice(0, 4);
        break;
      case 'amount':
        const numericValue = parseFloat(value) || 0;
        setFormData(prev => ({ ...prev, [field]: numericValue }));
        return;
      case 'phone':
        processedValue = value.replace(/[^\d\s\-\(\)\+]/g, '');
        break;
      default:
        break;
    }

    setFormData(prev => ({ ...prev, [field]: processedValue }));
    
    // Clear error when user starts typing
    if (errors[field as keyof PaymentFormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Validate specific field on blur
    if (touched[field]) {
      validateForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || loading) {
      return;
    }

    const paymentData: PaymentFormData = {
      amount: formData.amount,
      currency,
      reference: formData.reference,
      cardDetails: {
        card_holder: formData.card_holder,
        card_number: formData.card_number.replace(/\s/g, ''),
        card_expiry: `${formData.expiry_month}/${formData.expiry_year}`,
        cvv: formData.cvv
      }
    };

    if (requireCustomer) {
      paymentData.customer = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone
      };
    }

    try {
      await onSubmit(paymentData);
    } catch (error) {
      console.error('Payment submission failed:', error);
      setErrors({ general: 'Payment failed. Please try again.' });
    }
  };

  const getCardIcon = (type: CardType): string => {
    const icons = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      diners: '💳',
      discover: '💳',
      jcb: '💳',
      unknown: '💳'
    };
    return icons[type] || icons.unknown;
  };

  const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";
  const errorInputClasses = "w-full px-3 py-2 border border-red-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors bg-red-50";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";
  const errorClasses = "text-red-600 text-sm mt-1";

  return (
    <div className={`payment-form ${className}`}>
      {/* 3DS2 Integration */}
      {enable3DS && enableTokenization && accessToken && username && (
        <VerifyCard
          username={username}
          environment={Environment.sandbox}
          accessToken={accessToken}
          paymentIntent={{
            payment: {
              reference: formData.reference,
              amount: formData.amount,
              currency: currency
            },
            verification: verificationHash
          }}
          onScaSuccess={(event) => {
            scaCompletedRef.current = true;
            onScaSuccess?.(event);
          }}
          onScaError={(error) => {
            console.error('3DS error:', error);
            onScaError?.(error);
            setErrors({ general: '3D Secure authentication failed' });
          }}
          options={{
            sca_enabled: true,
          }}
        />
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="text-red-600 text-sm">{errors.general}</div>
          </div>
        )}

        {/* Amount Field */}
        {showAmountField && (
          <div>
            <label htmlFor="amount" className={labelClasses}>
              Amount ({currency})
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={formData.amount || ''}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              onBlur={() => handleBlur('amount')}
              className={errors.amount ? errorInputClasses : inputClasses}
              placeholder="0.00"
              disabled={loading}
            />
            {errors.amount && <div className={errorClasses}>{errors.amount}</div>}
          </div>
        )}

        {/* Card Details */}
        <div className="grid grid-cols-1 gap-4">
          {/* Card Holder */}
          <div>
            <label htmlFor="card_holder" className={labelClasses}>
              Card Holder Name
            </label>
            <input
              id="card_holder"
              type="text"
              value={formData.card_holder}
              onChange={(e) => handleInputChange('card_holder', e.target.value)}
              onBlur={() => handleBlur('card_holder')}
              className={errors.card_holder ? errorInputClasses : inputClasses}
              placeholder="John Doe"
              disabled={loading}
              autoComplete="cc-name"
            />
            {errors.card_holder && <div className={errorClasses}>{errors.card_holder}</div>}
          </div>

          {/* Card Number */}
          <div>
            <label htmlFor="card_number" className={labelClasses}>
              Card Number
            </label>
            <div className="relative">
              <input
                id="card_number"
                type="text"
                value={formData.card_number}
                onChange={(e) => handleInputChange('card_number', e.target.value)}
                onBlur={() => handleBlur('card_number')}
                className={errors.card_number ? errorInputClasses : inputClasses}
                placeholder="1234 5678 9012 3456"
                disabled={loading}
                autoComplete="cc-number"
                maxLength={19}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-lg" title={cardType}>
                  {getCardIcon(cardType)}
                </span>
              </div>
            </div>
            {errors.card_number && <div className={errorClasses}>{errors.card_number}</div>}
          </div>

          {/* Expiry and CVV */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="card_expiry" className={labelClasses}>
                Expiry (MM/YY)
              </label>
              <input
                id="card_expiry"
                type="text"
                value={`${formData.expiry_month}${formData.expiry_year ? '/' + formData.expiry_year : ''}`}
                onChange={(e) => handleInputChange('card_expiry', e.target.value)}
                onBlur={() => handleBlur('card_expiry')}
                className={errors.card_expiry ? errorInputClasses : inputClasses}
                placeholder="12/25"
                disabled={loading}
                autoComplete="cc-exp"
                maxLength={5}
              />
              {errors.card_expiry && <div className={errorClasses}>{errors.card_expiry}</div>}
            </div>

            <div>
              <label htmlFor="cvv" className={labelClasses}>
                CVV
              </label>
              <input
                id="cvv"
                type="text"
                value={formData.cvv}
                onChange={(e) => handleInputChange('cvv', e.target.value)}
                onBlur={() => handleBlur('cvv')}
                className={errors.cvv ? errorInputClasses : inputClasses}
                placeholder="123"
                disabled={loading}
                autoComplete="cc-csc"
                maxLength={4}
              />
              {errors.cvv && <div className={errorClasses}>{errors.cvv}</div>}
            </div>
          </div>
        </div>

        {/* Customer Details */}
        {requireCustomer && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900">Customer Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className={labelClasses}>
                  First Name
                </label>
                <input
                  id="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  className={inputClasses}
                  placeholder="John"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="last_name" className={labelClasses}>
                  Last Name
                </label>
                <input
                  id="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  className={inputClasses}
                  placeholder="Doe"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className={labelClasses}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                className={errors.email ? errorInputClasses : inputClasses}
                placeholder="john@example.com"
                disabled={loading}
                autoComplete="email"
              />
              {errors.email && <div className={errorClasses}>{errors.email}</div>}
            </div>

            <div>
              <label htmlFor="phone" className={labelClasses}>
                Phone Number (Optional)
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={inputClasses}
                placeholder="+61 400 000 000"
                disabled={loading}
                autoComplete="tel"
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || isValidating}
          className={`w-full py-3 px-4 rounded-md font-medium text-sm transition-colors ${
            loading || isValidating
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
          } text-white`}
        >
          {loading 
            ? 'Processing...' 
            : isValidating 
              ? 'Validating...'
              : `Pay ${formatCurrency(formData.amount || amount || 0, currency)}`
          }
        </button>

        {/* Security Notice */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            🔒 Your payment information is encrypted and secure
          </p>
          {enableTokenization && (
            <p className="text-xs text-gray-500 mt-1">
              Card details will be securely tokenized for future use
            </p>
          )}
        </div>
      </form>
    </div>
  );
}