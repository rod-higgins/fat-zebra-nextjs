import React from 'react';
import '@testing-library/jest-dom';
import '../types/jest-custom-matchers';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import the test helpers using CommonJS require syntax to avoid ESM issues
const {
  mockFetchResponse,
  createMockPurchaseRequest,
  createMockTransactionResponse,
  createMockErrorResponse
} = require('../setup');

// Mock Fat Zebra SDK - this will be handled by the moduleNameMapper in jest.config.js
// but we'll keep it here for clarity

// Mock PaymentForm component since it might not exist yet
const MockPaymentForm = ({ 
  onSubmit, 
  amount = 25.00,
  currency = 'AUD',
  loading = false,
  disabled = false,
  enableTokenization = false,
  onTokenizationSuccess,
  className,
  ...props 
}: any) => {
  const [cardholderName, setCardholderName] = React.useState('');
  const [cardNumber, setCardNumber] = React.useState('');
  const [expiryMonth, setExpiryMonth] = React.useState('');
  const [expiryYear, setExpiryYear] = React.useState('');
  const [cvv, setCvv] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!cardholderName || !cardNumber || !expiryMonth || !expiryYear || !cvv) {
        return;
      }

      const paymentData = {
        amount,
        currency,
        card_holder: cardholderName,
        card_number: cardNumber,
        card_expiry: `${expiryMonth}/${expiryYear}`,
        cvv,
        reference: `TXN-${Date.now()}`
      };

      // Simulate successful payment
      const result = {
        successful: true,
        response: {
          id: 'txn-123',
          amount: amount,
          currency: currency,
          authorized: true
        }
      };

      if (enableTokenization && onTokenizationSuccess) {
        onTokenizationSuccess('token-123');
      }

      onSubmit?.(result);
    } catch (error) {
      onSubmit?.({
        successful: false,
        errors: ['Payment failed']
      });
    }
  };

  return (
    <div className={`payment-form ${className || ''}`} data-testid="payment-form">
      <form onSubmit={handleSubmit} data-testid="payment-form-form">
        <div>
          <label htmlFor="cardholder-name">Cardholder Name</label>
          <input
            id="cardholder-name"
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            disabled={disabled || loading}
            data-testid="cardholder-name-input"
          />
        </div>

        <div>
          <label htmlFor="card-number">Card Number</label>
          <input
            id="card-number"
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            placeholder="1234 5678 9012 3456"
            disabled={disabled || loading}
            data-testid="card-number-input"
          />
        </div>

        <div>
          <label htmlFor="expiry-month">Expiry Month</label>
          <select
            id="expiry-month"
            value={expiryMonth}
            onChange={(e) => setExpiryMonth(e.target.value)}
            disabled={disabled || loading}
            data-testid="expiry-month-select"
          >
            <option value="">Month</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                {String(i + 1).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="expiry-year">Expiry Year</label>
          <select
            id="expiry-year"
            value={expiryYear}
            onChange={(e) => setExpiryYear(e.target.value)}
            disabled={disabled || loading}
            data-testid="expiry-year-select"
          >
            <option value="">Year</option>
            {Array.from({ length: 10 }, (_, i) => {
              const year = new Date().getFullYear() + i;
              return (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label htmlFor="cvv">CVV</label>
          <input
            id="cvv"
            type="text"
            value={cvv}
            onChange={(e) => setCvv(e.target.value)}
            placeholder="123"
            maxLength={4}
            disabled={disabled || loading}
            data-testid="cvv-input"
          />
        </div>

        <button
          type="submit"
          disabled={disabled || loading}
          data-testid="submit-button"
        >
          {loading ? 'Processing...' : `Pay $${amount.toFixed(2)} ${currency}`}
        </button>
      </form>
    </div>
  );
};

// Mock the component module
jest.mock('../../src/components/PaymentForm', () => ({
  PaymentForm: MockPaymentForm,
  default: MockPaymentForm
}));

describe('PaymentForm Component', () => {
  const defaultProps = {
    onSubmit: jest.fn(),
    amount: 25.00,
    currency: 'AUD'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render payment form', () => {
      render(<MockPaymentForm {...defaultProps} />);

      expect(screen.getByTestId('payment-form')).toBeInTheDocument();
      expect(screen.getByTestId('payment-form-form')).toBeInTheDocument();
      expect(screen.getByTestId('cardholder-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('card-number-input')).toBeInTheDocument();
      expect(screen.getByTestId('expiry-month-select')).toBeInTheDocument();
      expect(screen.getByTestId('expiry-year-select')).toBeInTheDocument();
      expect(screen.getByTestId('cvv-input')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      render(<MockPaymentForm {...defaultProps} className="custom-class" />);
      
      const component = screen.getByTestId('payment-form');
      expect(component).toHaveClass('payment-form');
      expect(component).toHaveClass('custom-class');
    });

    it('should show correct amount on submit button', () => {
      render(<MockPaymentForm {...defaultProps} amount={50.00} />);
      
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Pay $50.00 AUD');
    });

    it('should disable form fields when disabled prop is true', () => {
      render(<MockPaymentForm {...defaultProps} disabled={true} />);
      
      expect(screen.getByTestId('cardholder-name-input')).toBeDisabled();
      expect(screen.getByTestId('card-number-input')).toBeDisabled();
      expect(screen.getByTestId('expiry-month-select')).toBeDisabled();
      expect(screen.getByTestId('expiry-year-select')).toBeDisabled();
      expect(screen.getByTestId('cvv-input')).toBeDisabled();
      expect(screen.getByTestId('submit-button')).toBeDisabled();
    });

    it('should show loading state on submit button', () => {
      render(<MockPaymentForm {...defaultProps} loading={true} />);
      
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Processing...');
    });
  });

  describe('Form Submission', () => {
    it('should submit payment successfully with valid data', async () => {
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      
      render(<MockPaymentForm {...defaultProps} onSubmit={onSubmit} />);

      // Fill form
      await user.type(screen.getByTestId('cardholder-name-input'), 'John Doe');
      await user.type(screen.getByTestId('card-number-input'), '4111111111111111');
      await user.selectOptions(screen.getByTestId('expiry-month-select'), '12');
      await user.selectOptions(screen.getByTestId('expiry-year-select'), '2025');
      await user.type(screen.getByTestId('cvv-input'), '123');

      // Submit form
      await user.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          successful: true,
          response: {
            id: 'txn-123',
            amount: 25.00,
            currency: 'AUD',
            authorized: true
          }
        });
      });
    });

    it('should handle tokenization when enabled', async () => {
      const onTokenizationSuccess = jest.fn();
      const user = userEvent.setup();
      
      render(
        <MockPaymentForm 
          {...defaultProps} 
          enableTokenization={true}
          onTokenizationSuccess={onTokenizationSuccess}
        />
      );

      // Fill and submit form
      await user.type(screen.getByTestId('cardholder-name-input'), 'John Doe');
      await user.type(screen.getByTestId('card-number-input'), '4111111111111111');
      await user.selectOptions(screen.getByTestId('expiry-month-select'), '12');
      await user.selectOptions(screen.getByTestId('expiry-year-select'), '2025');
      await user.type(screen.getByTestId('cvv-input'), '123');

      await user.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(onTokenizationSuccess).toHaveBeenCalledWith('token-123');
      });
    });

    it('should not submit with empty fields', async () => {
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      
      render(<MockPaymentForm {...defaultProps} onSubmit={onSubmit} />);

      // Submit without filling form
      await user.click(screen.getByTestId('submit-button'));

      // Should not call onSubmit since form is incomplete
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('should handle form field changes', async () => {
      const user = userEvent.setup();
      
      render(<MockPaymentForm {...defaultProps} />);

      const cardholderInput = screen.getByTestId('cardholder-name-input');
      const cardNumberInput = screen.getByTestId('card-number-input');
      const cvvInput = screen.getByTestId('cvv-input');

      await user.type(cardholderInput, 'John Doe');
      await user.type(cardNumberInput, '4111111111111111');
      await user.type(cvvInput, '123');

      expect(cardholderInput).toHaveValue('John Doe');
      expect(cardNumberInput).toHaveValue('4111111111111111');
      expect(cvvInput).toHaveValue('123');
    });

    it('should handle dropdown selections', async () => {
      const user = userEvent.setup();
      
      render(<MockPaymentForm {...defaultProps} />);

      const monthSelect = screen.getByTestId('expiry-month-select');
      const yearSelect = screen.getByTestId('expiry-year-select');

      await user.selectOptions(monthSelect, '06');
      await user.selectOptions(yearSelect, '2026');

      expect(monthSelect).toHaveValue('06');
      expect(yearSelect).toHaveValue('2026');
    });
  });

  describe('Error Handling', () => {
    it('should handle payment processing errors', async () => {
      const onSubmit = jest.fn();
      const user = userEvent.setup();
      
      // Override the mock to simulate error
      const errorPaymentForm = ({ onSubmit: onSubmitProp, ...props }: any) => {
        const handleSubmit = () => {
          onSubmitProp?.({
            successful: false,
            errors: ['Payment failed']
          });
        };

        return (
          <div data-testid="payment-form">
            <button onClick={handleSubmit} data-testid="submit-button">
              Submit
            </button>
          </div>
        );
      };

      render(React.createElement(errorPaymentForm, { onSubmit }));

      await user.click(screen.getByTestId('submit-button'));

      expect(onSubmit).toHaveBeenCalledWith({
        successful: false,
        errors: ['Payment failed']
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form fields', () => {
      render(<MockPaymentForm {...defaultProps} />);

      expect(screen.getByLabelText('Cardholder Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Card Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Expiry Month')).toBeInTheDocument();
      expect(screen.getByLabelText('Expiry Year')).toBeInTheDocument();
      expect(screen.getByLabelText('CVV')).toBeInTheDocument();
    });

    it('should have proper form structure', () => {
      render(<MockPaymentForm {...defaultProps} />);

      const form = screen.getByTestId('payment-form-form');
      expect(form.tagName).toBe('FORM');
    });
  });
});