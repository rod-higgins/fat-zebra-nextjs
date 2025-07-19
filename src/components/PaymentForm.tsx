/**
 * Fat Zebra Next.js Package - Payment Form Component
 * Complete React payment form with validation and error handling
 */

import React, { useState, useCallback } from 'react';
import type { 
  PaymentFormProps, 
  PaymentFormData, 
  CardDetails, 
  Customer, 
  PaymentFormErrors 
} from '../types';
import { validateCard, formatCardNumber, formatExpiryDate, formatCvv } from '../utils';

export function PaymentForm({ 
  onSubmit, 
  amount, 
  currency = 'AUD', 
  loading = false, 
  enableTokenization = false, 
  onTokenizationSuccess,
  className = '' 
}: PaymentFormProps) {
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: amount || 0,
    cardDetails: {
      card_holder: '',
      card_number: '',
      card_expiry: '',
      cvv: '',
    },
    customer: {
      email: '',
      first_name: '',
      last_name: '',
    },
  });

  const [errors, setErrors] = useState<PaymentFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => {
      if (field.startsWith('card_')) {
        const cardField = field.replace('card_', '') as keyof CardDetails;
        let formattedValue = value;

        // Apply formatting
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

        return {
          ...prev,
          cardDetails: {
            ...prev.cardDetails,
            [cardField]: formattedValue,
          },
        };
      }

      if (field.startsWith('customer_')) {
        const customerField = field.replace('customer_', '') as keyof Customer;
        return {
          ...prev,
          customer: {
            ...prev.customer,
            [customerField]: value,
          },
        };
      }

      return {
        ...prev,
        [field]: field === 'amount' ? parseFloat(value) || 0 : value,
      };
    });

    // Clear field error when user starts typing
    if (errors[field as keyof PaymentFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  }, [errors]);

  const validateForm = useCallback((): boolean => {
    const newErrors: PaymentFormErrors = {};

    // Validate amount
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    // Validate card details
    const cardValidation = validateCard(formData.cardDetails);
    if (!cardValidation.valid) {
      cardValidation.errors.forEach(error => {
        if (error.includes('holder')) {
          newErrors.card_holder = error;
        } else if (error.includes('number')) {
          newErrors.card_number = error;
        } else if (error.includes('expiry')) {
          newErrors.card_expiry = error;
        } else if (error.includes('CVV')) {
          newErrors.cvv = error;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || loading) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await onSubmit(formData);
      
      if (enableTokenization && onTokenizationSuccess) {
        // In a real implementation, this would come from the payment response
        onTokenizationSuccess('token_placeholder');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      setErrors({ general: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, validateForm, isSubmitting, loading, enableTokenization, onTokenizationSuccess]);

  const isFormLoading = loading || isSubmitting;

  return (
    <form onSubmit={handleSubmit} className={`fat-zebra-payment-form ${className}`}>
      {/* Amount field (if not provided as prop) */}
      {!amount && (
        <div className="form-group">
          <label htmlFor="amount">
            Amount ({currency})
            <span className="required">*</span>
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={formData.amount || ''}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            disabled={isFormLoading}
            className={errors.amount ? 'error' : ''}
            placeholder="0.00"
          />
          {errors.amount && <span className="error-message">{errors.amount}</span>}
        </div>
      )}

      {/* Card holder name */}
      <div className="form-group">
        <label htmlFor="card_holder">
          Card Holder Name
          <span className="required">*</span>
        </label>
        <input
          id="card_holder"
          type="text"
          value={formData.cardDetails.card_holder}
          onChange={(e) => handleInputChange('card_card_holder', e.target.value)}
          disabled={isFormLoading}
          className={errors.card_holder ? 'error' : ''}
          placeholder="John Smith"
          autoComplete="cc-name"
        />
        {errors.card_holder && <span className="error-message">{errors.card_holder}</span>}
      </div>

      {/* Card number */}
      <div className="form-group">
        <label htmlFor="card_number">
          Card Number
          <span className="required">*</span>
        </label>
        <input
          id="card_number"
          type="text"
          value={formData.cardDetails.card_number}
          onChange={(e) => handleInputChange('card_card_number', e.target.value)}
          disabled={isFormLoading}
          className={errors.card_number ? 'error' : ''}
          placeholder="1234 5678 9012 3456"
          autoComplete="cc-number"
          maxLength={23} // Formatted number with spaces
        />
        {errors.card_number && <span className="error-message">{errors.card_number}</span>}
      </div>

      {/* Expiry and CVV row */}
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="card_expiry">
            Expiry Date
            <span className="required">*</span>
          </label>
          <input
            id="card_expiry"
            type="text"
            value={formData.cardDetails.card_expiry}
            onChange={(e) => handleInputChange('card_card_expiry', e.target.value)}
            disabled={isFormLoading}
            className={errors.card_expiry ? 'error' : ''}
            placeholder="MM/YY"
            autoComplete="cc-exp"
            maxLength={5}
          />
          {errors.card_expiry && <span className="error-message">{errors.card_expiry}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="cvv">
            CVV
            <span className="required">*</span>
          </label>
          <input
            id="cvv"
            type="text"
            value={formData.cardDetails.cvv}
            onChange={(e) => handleInputChange('card_cvv', e.target.value)}
            disabled={isFormLoading}
            className={errors.cvv ? 'error' : ''}
            placeholder="123"
            autoComplete="cc-csc"
            maxLength={4}
          />
          {errors.cvv && <span className="error-message">{errors.cvv}</span>}
        </div>
      </div>

      {/* Customer information */}
      <div className="customer-section">
        <h3>Customer Information</h3>
        
        <div className="form-group">
          <label htmlFor="customer_email">Email</label>
          <input
            id="customer_email"
            type="email"
            value={formData.customer?.email || ''}
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
              value={formData.customer?.first_name || ''}
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
              value={formData.customer?.last_name || ''}
              onChange={(e) => handleInputChange('customer_last_name', e.target.value)}
              disabled={isFormLoading}
              placeholder="Smith"
              autoComplete="family-name"
            />
          </div>
        </div>
      </div>

      {/* General error */}
      {errors.general && (
        <div className="error-message general-error">
          {errors.general}
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
          `Pay ${amount ? `${currency} ${amount.toFixed(2)}` : ''}`
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

      {/* Basic styles */}
      <style jsx>{`
        .fat-zebra-payment-form {
          max-width: 500px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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

        label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
          color: #333;
        }

        .required {
          color: #e74c3c;
          margin-left: 2px;
        }

        input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        input:focus {
          outline: none;
          border-color: #3498db;
          box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.1);
        }

        input.error {
          border-color: #e74c3c;
        }

        input:disabled {
          background-color: #f8f9fa;
          cursor: not-allowed;
        }

        .error-message {
          display: block;
          color: #e74c3c;
          font-size: 14px;
          margin-top: 4px;
        }

        .general-error {
          background-color: #fdf2f2;
          border: 1px solid #e74c3c;
          border-radius: 4px;
          padding: 12px;
          margin: 16px 0;
        }

        .customer-section {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid #eee;
        }

        .customer-section h3 {
          margin: 0 0 16px 0;
          font-size: 18px;
          color: #333;
        }

        .submit-button {
          width: 100%;
          padding: 16px;
          background-color: #3498db;
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
          background-color: #2980b9;
        }

        .submit-button:disabled {
          background-color: #bdc3c7;
          cursor: not-allowed;
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
          margin-top: 12px;
          text-align: center;
        }

        .tokenization-info small {
          color: #666;
          font-size: 12px;
        }
      `}</style>
    </form>
  );
}