import React, { useState, useCallback, useEffect } from 'react';
import { usePayment } from '../hooks/usePayment';
import { 
  formatCardNumber, 
  formatExpiryDate, 
  formatCvv,
  validateCard,
  validateEmail,
  extractErrorMessage 
} from '../utils';
import type { PaymentFormProps, PaymentFormErrors, Customer } from '../types';

// Form-specific type with required string fields for better form handling
interface FormCustomer {
  email: string;
  first_name: string;
  last_name: string;
}

interface FormData {
  card_holder: string;
  card_number: string;
  card_expiry: string;
  cvv: string;
  customer: FormCustomer;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  amount,
  currency = 'AUD',
  loading: externalLoading = false,
  enableTokenization = false,
  onTokenizationSuccess,
  className = '',
}) => {
  const [formData, setFormData] = useState<FormData>({
    card_holder: '',
    card_number: '',
    card_expiry: '',
    cvv: '',
    customer: {
      email: '',
      first_name: '',
      last_name: '',
    },
  });

  const [errors, setErrors] = useState<PaymentFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const { processPayment, loading: paymentLoading, error: paymentError } = usePayment({
    onSuccess: (response) => {
      console.log('Payment successful:', response);
      if (enableTokenization && onTokenizationSuccess && response.authorization) {
        onTokenizationSuccess(response.authorization);
      }
    },
    onError: (error) => {
      console.error('Payment error:', error);
      setErrors(prev => ({
        ...prev,
        general: extractErrorMessage(error)
      }));
    }
  });

  const isFormLoading = externalLoading || paymentLoading;

  const validateForm = useCallback(() => {
    const newErrors: PaymentFormErrors = {};

    // Validate card details
    if (touched.card_holder && !formData.card_holder.trim()) {
      newErrors.card_holder = 'Cardholder name is required';
    }

    if (touched.card_number) {
      const cardValidation = validateCard({
        card_holder: formData.card_holder,
        card_number: formData.card_number,
        card_expiry: formData.card_expiry,
        cvv: formData.cvv
      });
      
      if (!cardValidation.valid && cardValidation.errors.length > 0) {
        newErrors.card_number = cardValidation.errors[0];
      }
    }

    if (touched.card_expiry && !formData.card_expiry.match(/^\d{2}\/\d{2}$/)) {
      newErrors.card_expiry = 'Please enter a valid expiry date (MM/YY)';
    }

    if (touched.cvv && (!formData.cvv || formData.cvv.length < 3)) {
      newErrors.cvv = 'Please enter a valid CVV';
    }

    // Validate email if provided
    if (formData.customer.email && touched.customer_email) {
      const emailValidation = validateEmail(formData.customer.email);
      if (!emailValidation.valid) {
        newErrors.general = emailValidation.error || 'Invalid email address';
      }
    }

    setErrors(newErrors);
  }, [formData, touched]);

  // Validate form on changes
  useEffect(() => {
    validateForm();
  }, [formData, validateForm]);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => {
      if (field.startsWith('customer_')) {
        const customerField = field.replace('customer_', '') as keyof FormCustomer;
        return {
          ...prev,
          customer: {
            ...prev.customer,
            [customerField]: value
          }
        };
      }

      // Format certain fields
      let formattedValue = value;
      if (field === 'card_number') {
        formattedValue = formatCardNumber(value);
      } else if (field === 'card_expiry') {
        formattedValue = formatExpiryDate(value);
      } else if (field === 'cvv') {
        formattedValue = formatCvv(value);
      }

      return {
        ...prev,
        [field]: formattedValue
      };
    });

    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched for validation
    setTouched({
      card_holder: true,
      card_number: true,
      card_expiry: true,
      cvv: true,
      customer_email: true,
    });

    // Clear previous errors
    setErrors({});

    try {
      // Convert form customer data to API customer data (filtering out empty strings)
      const customerData: Customer = {};
      if (formData.customer.email.trim()) {
        customerData.email = formData.customer.email.trim();
      }
      if (formData.customer.first_name.trim()) {
        customerData.first_name = formData.customer.first_name.trim();
      }
      if (formData.customer.last_name.trim()) {
        customerData.last_name = formData.customer.last_name.trim();
      }

      await processPayment({
        amount,
        currency,
        card_holder: formData.card_holder,
        card_number: formData.card_number.replace(/\s/g, ''),
        card_expiry: formData.card_expiry,
        cvv: formData.cvv,
        ...(Object.keys(customerData).length > 0 && { customer: customerData }),
        reference: `PAY-${Date.now()}`,
      });
    } catch (error) {
      // Error is handled by the usePayment hook
      console.error('Form submission error:', error);
    }
  }, [amount, currency, formData, processPayment]);

  return (
    <form onSubmit={handleSubmit} className={`fat-zebra-payment-form ${className}`}>
      <style>{`
        .fat-zebra-payment-form {
          max-width: 500px;
          margin: 0 auto;
          padding: 24px;
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          background: #ffffff;
        }

        .fat-zebra-payment-form h2 {
          margin: 0 0 24px 0;
          font-size: 24px;
          font-weight: 600;
          color: #2d3748;
        }

        .form-section {
          margin-bottom: 24px;
        }

        .form-section h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          font-weight: 500;
          color: #4a5568;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-row {
          display: flex;
          gap: 16px;
        }

        .form-row .form-group {
          flex: 1;
        }

        .form-group label {
          display: block;
          margin-bottom: 4px;
          font-size: 14px;
          font-weight: 500;
          color: #2d3748;
        }

        .form-group input {
          width: 100%;
          padding: 12px;
          border: 1px solid #cbd5e0;
          border-radius: 4px;
          font-size: 16px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: #4299e1;
          box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
        }

        .form-group input:disabled {
          background-color: #f7fafc;
          cursor: not-allowed;
        }

        .form-group input.error {
          border-color: #e53e3e;
        }

        .error-message {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          color: #e53e3e;
        }

        .general-error {
          margin: 16px 0;
          padding: 12px;
          background-color: #fed7d7;
          border: 1px solid #feb2b2;
          border-radius: 4px;
          color: #c53030;
        }

        .submit-button {
          width: 100%;
          padding: 16px;
          background-color: #4299e1;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .submit-button:hover:not(:disabled) {
          background-color: #3182ce;
        }

        .submit-button:disabled {
          background-color: #a0aec0;
          cursor: not-allowed;
        }

        .submit-button.loading {
          background-color: #a0aec0;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .tokenization-info {
          margin-top: 16px;
          padding: 12px;
          background-color: #ebf8ff;
          border: 1px solid #bee3f8;
          border-radius: 4px;
          font-size: 12px;
          color: #2b6cb0;
        }

        .amount-display {
          margin-bottom: 24px;
          padding: 16px;
          background-color: #f7fafc;
          border-radius: 4px;
          text-align: center;
        }

        .amount-display .amount {
          font-size: 24px;
          font-weight: 600;
          color: #2d3748;
        }

        .amount-display .currency {
          font-size: 14px;
          color: #4a5568;
          margin-left: 4px;
        }
      `}</style>

      <h2>Payment Details</h2>

      {/* Amount display */}
      <div className="amount-display">
        <span className="amount">{amount.toFixed(2)}</span>
        <span className="currency">{currency}</span>
      </div>

      {/* Card details section */}
      <div className="form-section">
        <h3>Card Information</h3>
        
        <div className="form-group">
          <label htmlFor="card_holder">Cardholder Name</label>
          <input
            id="card_holder"
            type="text"
            value={formData.card_holder}
            onChange={(e) => handleInputChange('card_holder', e.target.value)}
            disabled={isFormLoading}
            className={errors.card_holder ? 'error' : ''}
            placeholder="John Smith"
            autoComplete="cc-name"
          />
          {errors.card_holder && <span className="error-message">{errors.card_holder}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="card_number">Card Number</label>
          <input
            id="card_number"
            type="text"
            value={formData.card_number}
            onChange={(e) => handleInputChange('card_number', e.target.value)}
            disabled={isFormLoading}
            className={errors.card_number ? 'error' : ''}
            placeholder="1234 5678 9012 3456"
            autoComplete="cc-number"
            maxLength={19}
          />
          {errors.card_number && <span className="error-message">{errors.card_number}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="card_expiry">Expiry Date</label>
            <input
              id="card_expiry"
              type="text"
              value={formData.card_expiry}
              onChange={(e) => handleInputChange('card_expiry', e.target.value)}
              disabled={isFormLoading}
              className={errors.card_expiry ? 'error' : ''}
              placeholder="MM/YY"
              autoComplete="cc-exp"
              maxLength={5}
            />
            {errors.card_expiry && <span className="error-message">{errors.card_expiry}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="cvv">CVV</label>
            <input
              id="cvv"
              type="text"
              value={formData.cvv}
              onChange={(e) => handleInputChange('cvv', e.target.value)}
              disabled={isFormLoading}
              className={errors.cvv ? 'error' : ''}
              placeholder="123"
              autoComplete="cc-csc"
              maxLength={4}
            />
            {errors.cvv && <span className="error-message">{errors.cvv}</span>}
          </div>
        </div>
      </div>

      {/* Customer information */}
      <div className="form-section">
        <h3>Customer Information</h3>
        
        <div className="form-group">
          <label htmlFor="customer_email">Email</label>
          <input
            id="customer_email"
            type="email"
            value={formData.customer.email}
            onChange={(e) => handleInputChange('customer_email', e.target.value)}
            disabled={isFormLoading}
            placeholder="john@example.com"
            autoComplete="email"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="customer_first_name">First Name</label>
            <input
              id="customer_first_name"
              type="text"
              value={formData.customer.first_name}
              onChange={(e) => handleInputChange('customer_first_name', e.target.value)}
              disabled={isFormLoading}
              placeholder="John"
              autoComplete="given-name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="customer_last_name">Last Name</label>
            <input
              id="customer_last_name"
              type="text"
              value={formData.customer.last_name}
              onChange={(e) => handleInputChange('customer_last_name', e.target.value)}
              disabled={isFormLoading}
              placeholder="Smith"
              autoComplete="family-name"
            />
          </div>
        </div>
      </div>

      {/* General error */}
      {(errors.general || paymentError) && (
        <div className="error-message general-error">
          {errors.general || paymentError}
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={isFormLoading}
        className={`submit-button ${isFormLoading ? 'loading' : ''}`}
      >
        {isFormLoading ? (
          <>
            <span className="spinner"></span>
            Processing...
          </>
        ) : (
          `Pay ${currency} ${amount.toFixed(2)}`
        )}
      </button>

      {/* Tokenization info */}
      {enableTokenization && (
        <div className="tokenization-info">
          <small>
            Your card details will be securely tokenized for future payments.
          </small>
        </div>
      )}
    </form>
  );
};