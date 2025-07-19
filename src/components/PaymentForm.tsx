import React, { useState, useEffect, useRef } from 'react';
import { PaymentFormProps, CardDetails, Customer, PaymentFormErrors } from '../types';
import { validateCard, formatCardNumber, formatExpiryDate, getCardType } from '../utils';

export const PaymentForm: React.FC<PaymentFormProps> = ({
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
}) => {
  // Form state
  const [formData, setFormData] = useState({
    card_holder: '',
    card_number: '',
    card_expiry: '',
    cvv: '',
    amount: amount || 0,
    currency,
    reference: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    country: 'AU'
  });

  const [errors, setErrors] = useState<PaymentFormErrors>({});
  const [cardType, setCardType] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 3DS2 integration ref
  const fatZebraRef = useRef<any>(null);

  // Load Fat Zebra SDK for 3DS2 if enabled
  useEffect(() => {
    if (enable3DS && accessToken && username) {
      loadFatZebraSDK();
    }
  }, [enable3DS, accessToken, username]);

  const loadFatZebraSDK = async () => {
    try {
      // Dynamically import Fat Zebra SDK
      const { FatZebra } = await import('@fat-zebra/sdk');
      
      fatZebraRef.current = new FatZebra({
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
        accessToken,
        username
      });

      // Set up event listeners
      fatZebraRef.current.on('sca_success', (event: any) => {
        onScaSuccess?.(event);
      });

      fatZebraRef.current.on('sca_error', (error: any) => {
        onScaError?.(error);
      });

    } catch (error) {
      console.error('Failed to load Fat Zebra SDK:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: PaymentFormErrors = {};

    // Card holder validation
    if (!formData.card_holder.trim()) {
      newErrors.card_holder = 'Card holder name is required';
    }

    // Card number validation
    const cardValidation = validateCard(formData.card_number);
    if (!cardValidation.isValid) {
      newErrors.card_number = cardValidation.errors[0] || 'Invalid card number';
    }

    // Expiry validation
    if (!formData.card_expiry || !/^\d{2}\/\d{2}$/.test(formData.card_expiry)) {
      newErrors.card_expiry = 'Please enter expiry as MM/YY';
    } else {
      const [month, year] = formData.card_expiry.split('/');
      const currentDate = new Date();
      const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
      
      if (expiryDate < currentDate) {
        newErrors.card_expiry = 'Card has expired';
      }
    }

    // CVV validation
    if (!formData.cvv || !/^\d{3,4}$/.test(formData.cvv)) {
      newErrors.cvv = 'Please enter a valid CVV';
    }

    // Amount validation (if shown)
    if (showAmountField && (!formData.amount || formData.amount <= 0)) {
      newErrors.amount = 'Please enter a valid amount';
    }

    // Customer validation (if required)
    if (requireCustomer) {
      if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
      if (!formData.first_name.trim()) {
        newErrors.first_name = 'First name is required';
      }
      if (!formData.last_name.trim()) {
        newErrors.last_name = 'Last name is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Format card number
    if (name === 'card_number') {
      formattedValue = formatCardNumber(value);
      const type = getCardType(value);
      setCardType(type);
    }

    // Format expiry date
    if (name === 'card_expiry') {
      formattedValue = formatExpiryDate(value);
    }

    // Limit CVV length
    if (name === 'cvv' && value.length > 4) {
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));

    // Clear error for this field
    if (errors[name as keyof PaymentFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading || isSubmitting) return;
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Generate reference if not provided
      const reference = formData.reference || `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const cardDetails: CardDetails = {
        card_holder: formData.card_holder,
        card_number: formData.card_number.replace(/\s/g, ''),
        card_expiry: formData.card_expiry,
        cvv: formData.cvv
      };

      const customer: Customer = requireCustomer ? {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postcode: formData.postcode,
        country: formData.country
      } : undefined;

      const paymentData = {
        amount: formData.amount,
        currency: formData.currency,
        reference,
        cardDetails,
        customer
      };

      // Handle 3DS2 if enabled
      if (enable3DS && fatZebraRef.current) {
        // Process with 3DS2
        const result = await fatZebraRef.current.verify({
          card: cardDetails,
          amount: formData.amount,
          currency: formData.currency,
          reference
        });

        if (result.successful) {
          await onSubmit(paymentData);
        } else {
          throw new Error(result.errors?.[0] || '3DS verification failed');
        }
      } else {
        // Standard payment processing
        await onSubmit(paymentData);
      }

      // Handle tokenization if enabled
      if (enableTokenization && onTokenizationSuccess) {
        try {
          const tokenResponse = await fetch('/api/tokenize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardDetails })
          });

          if (tokenResponse.ok) {
            const { token } = await tokenResponse.json();
            onTokenizationSuccess(token);
          }
        } catch (tokenError) {
          console.warn('Tokenization failed:', tokenError);
        }
      }

    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Payment failed. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
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
            Amount ({currency})
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
            value={formData.card_holder}
            onChange={handleInputChange}
            className={inputClasses}
            disabled={loading || isSubmitting}
            autoComplete="cc-name"
          />
          {errors.card_holder && <p className={errorClasses}>{errors.card_holder}</p>}
        </div>

        {/* Card Number */}
        <div>
          <label htmlFor="card_number" className={labelClasses}>
            Card Number *
            {cardType && <span className="ml-2 text-xs text-gray-500">({cardType})</span>}
          </label>
          <input
            type="text"
            id="card_number"
            name="card_number"
            value={formData.card_number}
            onChange={handleInputChange}
            className={inputClasses}
            disabled={loading || isSubmitting}
            placeholder="1234 5678 9012 3456"
            autoComplete="cc-number"
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
              value={formData.card_expiry}
              onChange={handleInputChange}
              className={inputClasses}
              disabled={loading || isSubmitting}
              placeholder="MM/YY"
              autoComplete="cc-exp"
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
              value={formData.cvv}
              onChange={handleInputChange}
              className={inputClasses}
              disabled={loading || isSubmitting}
              placeholder="123"
              autoComplete="cc-csc"
            />
            {errors.cvv && <p className={errorClasses}>{errors.cvv}</p>}
          </div>
        </div>
      </div>

      {/* Customer Details (if required) */}
      {requireCustomer && (
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
                value={formData.first_name}
                onChange={handleInputChange}
                className={inputClasses}
                disabled={loading || isSubmitting}
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
                value={formData.last_name}
                onChange={handleInputChange}
                className={inputClasses}
                disabled={loading || isSubmitting}
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
              value={formData.email}
              onChange={handleInputChange}
              className={inputClasses}
              disabled={loading || isSubmitting}
            />
            {errors.email && <p className={errorClasses}>{errors.email}</p>}
          </div>
        </div>
      )}

      {/* Reference Field */}
      <div>
        <label htmlFor="reference" className={labelClasses}>
          Reference (Optional)
        </label>
        <input
          type="text"
          id="reference"
          name="reference"
          value={formData.reference}
          onChange={handleInputChange}
          className={inputClasses}
          disabled={loading || isSubmitting}
          placeholder="Order reference or ID"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || isSubmitting}
        className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors duration-200 ${
          loading || isSubmitting
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        }`}
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

      {/* Security Notice */}
      <div className="text-xs text-gray-500 text-center">
        <p>🔒 Your payment information is secure and encrypted</p>
        {enable3DS && <p>3D Secure authentication enabled for enhanced security</p>}
      </div>
    </form>
  );
};