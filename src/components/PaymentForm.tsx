import React, { useState, useCallback, FormEvent, ChangeEvent } from 'react';
import { PaymentFormProps, PaymentFormData, CardDetails, Customer, PaymentFormErrors } from '../types';
import { validateCard, formatCardNumber, formatExpiryDate, formatCvv } from '../utils';

export function PaymentForm({
  onSubmit,
  amount,
  currency = 'AUD',
  loading = false,
  enableTokenization = false,
  enable3DS = false,
  accessToken,
  username,
  onTokenizationSuccess,
  onScaSuccess,
  onScaError,
  className = '',
  showAmountField = false,
  requireCustomer = false
}: PaymentFormProps) {
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: amount || 0,
    currency,
    reference: '',
    cardDetails: {
      card_holder: '',
      card_number: '',
      card_expiry: '',
      cvv: ''
    },
    customer: requireCustomer ? {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      postcode: '',
      country: 'AU'
    } : undefined
  });

  const [errors, setErrors] = useState<PaymentFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = useCallback((): boolean => {
    const newErrors: PaymentFormErrors = {};

    // Validate amount
    if (showAmountField && (!formData.amount || formData.amount <= 0)) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    // Validate card details
    if (!formData.cardDetails.card_holder.trim()) {
      newErrors.card_holder = 'Card holder name is required';
    }

    const cardValidation = validateCard(formData.cardDetails.card_number);
    if (!cardValidation.isValid) {
      newErrors.card_number = cardValidation.errors[0] || 'Invalid card number';
    }

    if (!formData.cardDetails.card_expiry.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) {
      newErrors.card_expiry = 'Expiry date must be in MM/YY format';
    } else {
      // Check if card is expired
      const [month, year] = formData.cardDetails.card_expiry.split('/');
      const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
      const now = new Date();
      if (expiryDate < now) {
        newErrors.card_expiry = 'Card has expired';
      }
    }

    if (!formData.cardDetails.cvv || formData.cardDetails.cvv.length < 3) {
      newErrors.cvv = 'CVV must be at least 3 digits';
    }

    // Validate customer details if required
    if (requireCustomer && formData.customer) {
      if (!formData.customer.first_name?.trim()) {
        newErrors.first_name = 'First name is required';
      }
      if (!formData.customer.last_name?.trim()) {
        newErrors.last_name = 'Last name is required';
      }
      if (!formData.customer.email?.trim()) {
        newErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customer.email)) {
        newErrors.email = 'Invalid email format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, showAmountField, requireCustomer]);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name.startsWith('card_')) {
      const cardField = name.replace('card_', '') as keyof CardDetails;
      let formattedValue = value;

      // Apply formatting based on field
      switch (cardField) {
        case 'card_number':
          formattedValue = formatCardNumber(value);
          break;
        case 'card_expiry':
          formattedValue = formatExpiryDate(value);
          break;
        case 'cvv':
          formattedValue = formatCvv(value);
          break;
      }

      setFormData(prev => ({
        ...prev,
        cardDetails: {
          ...prev.cardDetails,
          [cardField]: formattedValue
        }
      }));
    } else if (name === 'amount') {
      setFormData(prev => ({
        ...prev,
        amount: parseFloat(value) || 0
      }));
    } else if (formData.customer && Object.keys(formData.customer).includes(name)) {
      setFormData(prev => ({
        ...prev,
        customer: {
          ...prev.customer!,
          [name]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error for this field
    if (errors[name as keyof PaymentFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  }, [errors, formData.customer]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || loading) return;

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Generate reference if not provided
      const submissionData: PaymentFormData = {
        ...formData,
        reference: formData.reference || `ORDER-${Date.now()}`
      };

      await onSubmit(submissionData);

    } catch (error) {
      setErrors({
        general: error instanceof Error 
          ? error.message 
          : 'Payment failed. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isSubmitting, loading, validateForm, onSubmit]);

  const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed";
  const errorClasses = "text-red-600 text-sm mt-1";
  const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {/* General Error */}
      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-red-600 text-sm">{errors.general}</p>
        </div>
      )}

      {/* Amount Field (if shown) */}
      {showAmountField && (
        <div>
          <label htmlFor="amount" className={labelClasses}>
            Amount ({currency}) *
          </label>
          <input
            type="number"
            id="amount"
            name="amount"
            value={formData.amount}
            onChange={handleInputChange}
            step="0.01"
            min="0.01"
            className={inputClasses}
            disabled={loading || isSubmitting}
            placeholder="0.00"
          />
          {errors.amount && <p className={errorClasses}>{errors.amount}</p>}
        </div>
      )}

      {/* Card Details Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Card Details</h3>
        
        {/* Card Holder */}
        <div>
          <label htmlFor="card_holder" className={labelClasses}>
            Card Holder Name *
          </label>
          <input
            type="text"
            id="card_holder"
            name="card_holder"
            value={formData.cardDetails.card_holder}
            onChange={handleInputChange}
            className={inputClasses}
            disabled={loading || isSubmitting}
            placeholder="John Doe"
            autoComplete="cc-name"
          />
          {errors.card_holder && <p className={errorClasses}>{errors.card_holder}</p>}
        </div>

        {/* Card Number */}
        <div>
          <label htmlFor="card_number" className={labelClasses}>
            Card Number *
          </label>
          <input
            type="text"
            id="card_number"
            name="card_number"
            value={formData.cardDetails.card_number}
            onChange={handleInputChange}
            className={inputClasses}
            disabled={loading || isSubmitting}
            placeholder="1234 5678 9012 3456"
            autoComplete="cc-number"
            maxLength={19}
          />
          {errors.card_number && <p className={errorClasses}>{errors.card_number}</p>}
        </div>

        {/* Expiry and CVV */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="card_expiry" className={labelClasses}>
              Expiry Date *
            </label>
            <input
              type="text"
              id="card_expiry"
              name="card_expiry"
              value={formData.cardDetails.card_expiry}
              onChange={handleInputChange}
              className={inputClasses}
              disabled={loading || isSubmitting}
              placeholder="MM/YY"
              autoComplete="cc-exp"
              maxLength={5}
            />
            {errors.card_expiry && <p className={errorClasses}>{errors.card_expiry}</p>}
          </div>

          <div>
            <label htmlFor="cvv" className={labelClasses}>
              CVV *
            </label>
            <input
              type="text"
              id="cvv"
              name="cvv"
              value={formData.cardDetails.cvv}
              onChange={handleInputChange}
              className={inputClasses}
              disabled={loading || isSubmitting}
              placeholder="123"
              autoComplete="cc-csc"
              maxLength={4}
            />
            {errors.cvv && <p className={errorClasses}>{errors.cvv}</p>}
          </div>
        </div>
      </div>

      {/* Customer Details (if required) */}
      {requireCustomer && formData.customer && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Customer Details</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className={labelClasses}>
                First Name *
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.customer.first_name || ''}
                onChange={handleInputChange}
                className={inputClasses}
                disabled={loading || isSubmitting}
                placeholder="John"
              />
              {errors.first_name && <p className={errorClasses}>{errors.first_name}</p>}
            </div>

            <div>
              <label htmlFor="last_name" className={labelClasses}>
                Last Name *
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.customer.last_name || ''}
                onChange={handleInputChange}
                className={inputClasses}
                disabled={loading || isSubmitting}
                placeholder="Doe"
              />
              {errors.last_name && <p className={errorClasses}>{errors.last_name}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="email" className={labelClasses}>
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.customer.email || ''}
              onChange={handleInputChange}
              className={inputClasses}
              disabled={loading || isSubmitting}
              placeholder="john@example.com"
            />
            {errors.email && <p className={errorClasses}>{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="phone" className={labelClasses}>
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.customer.phone || ''}
              onChange={handleInputChange}
              className={inputClasses}
              disabled={loading || isSubmitting}
              placeholder="+61 400 000 000"
            />
          </div>

          <div>
            <label htmlFor="address" className={labelClasses}>
              Address
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.customer.address || ''}
              onChange={handleInputChange}
              className={inputClasses}
              disabled={loading || isSubmitting}
              placeholder="123 Main Street"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label htmlFor="city" className={labelClasses}>
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.customer.city || ''}
                onChange={handleInputChange}
                className={inputClasses}
                disabled={loading || isSubmitting}
                placeholder="Sydney"
              />
            </div>

            <div>
              <label htmlFor="state" className={labelClasses}>
                State
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.customer.state || ''}
                onChange={handleInputChange}
                className={inputClasses}
                disabled={loading || isSubmitting}
                placeholder="NSW"
              />
            </div>

            <div>
              <label htmlFor="postcode" className={labelClasses}>
                Postcode
              </label>
              <input
                type="text"
                id="postcode"
                name="postcode"
                value={formData.customer.postcode || ''}
                onChange={handleInputChange}
                className={inputClasses}
                disabled={loading || isSubmitting}
                placeholder="2000"
              />
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={loading || isSubmitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading || isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            `Pay ${amount ? `${currency} ${amount.toFixed(2)}` : ''}`
          )}
        </button>
      </div>

      {/* 3DS2 Notice */}
      {enable3DS && (
        <div className="text-xs text-gray-500 text-center">
          This payment is secured with 3D Secure authentication
        </div>
      )}

      {/* Tokenization Notice */}
      {enableTokenization && (
        <div className="text-xs text-gray-500 text-center">
          Your card will be securely tokenized for future use
        </div>
      )}
    </form>
  );
}