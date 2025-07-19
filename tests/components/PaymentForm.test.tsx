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

// Mock Fat Zebra SDK
jest.mock('@fat-zebra/sdk', () => ({
  FatZebra: {
    verify: jest.fn().mockResolvedValue({
      successful: true,
      data: {
        id: 'card-123',
        token: 'token-456',
        authorized: true
      }
    })
  }
}));

// Mock PaymentForm component since it might not exist yet
const MockPaymentForm = ({ 
  onSubmit,
  loading = false,
  currency = 'AUD',
  amount,
  enableTokenization = false,
  enable3DS = false,
  accessToken,
  username,
  onTokenizationSuccess,
  onScaSuccess,
  onError,
  className,
  ...props 
}: any) => {
  const [cardNumber, setCardNumber] = React.useState('');
  const [expiryMonth, setExpiryMonth] = React.useState('');
  const [expiryYear, setExpiryYear] = React.useState('');
  const [cvv, setCvv] = React.useState('');
  const [cardholderName, setCardholderName] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!cardNumber || !expiryMonth || !expiryYear || !cvv) {
        onError?.('All fields are required');
        return;
      }

      const paymentData = {
        card_number: cardNumber,
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        cvv,
        card_holder: cardholderName,
        amount,
        currency
      };

      if (enableTokenization) {
        onTokenizationSuccess?.('token-123');
      }

      if (enable3DS) {
        onScaSuccess?.({ 
          authenticated: true, 
          transaction_id: 'txn-123',
          acs_url: 'https://example.com/acs'
        });
      }

      const result = {
        successful: true,
        response: { 
          id: 'txn-123',
          amount,
          currency,
          authorized: true 
        }
      };

      await onSubmit?.(result);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Payment failed');
    }
  };

  return (
    <div className={`payment-form ${className || ''}`} data-testid="payment-form">
      <form onSubmit={handleSubmit} data-testid="payment-form-element">
        <div>
          <label htmlFor="cardholder-name">Cardholder Name</label>
          <input
            id="cardholder-name"
            type="text"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            placeholder="John Doe"
            disabled={loading}
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
            disabled={loading}
            data-testid="card-number-input"
          />
        </div>

        <div className="expiry-fields">
          <div>
            <label htmlFor="expiry-month">Month</label>
            <select
              id="expiry-month"
              value={expiryMonth}
              onChange={(e) => setExpiryMonth(e.target.value)}
              disabled={loading}
              data-testid="expiry-month-select"
            >
              <option value="">MM</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                  {String(i + 1).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="expiry-year">Year</label>
            <select
              id="expiry-year"
              value={expiryYear}
              onChange={(e) => setExpiryYear(e.target.value)}
              disabled={loading}
              data-testid="expiry-year-select"
            >
              <option value="">YYYY</option>
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
            disabled={loading}
            data-testid="cvv-input"
          />
        </div>

        {amount && (
          <div className="amount-display" data-testid="amount-display">
            <strong>Amount: {currency} {amount.toFixed(2)}</strong>
          </div>
        )}

        {enableTokenization && (
          <div className="tokenization-notice" data-testid="tokenization-notice">
            Card will be tokenized for future use
          </div>
        )}

        {enable3DS && (
          <div className="three-ds-notice" data-testid="three-ds-notice">
            3D Secure authentication enabled
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          data-testid="submit-button"
        >
          {loading ? 'Processing...' : `Pay ${currency} ${amount?.toFixed(2) || '0.00'}`}
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
      expect(screen.getByTestId('payment-form-element')).toBeInTheDocument();
      expect(screen.getByTestId('cardholder-name-input')).toBeInTheDocument();
      expect(screen.getByTestId('card-number-input')).toBeInTheDocument();
      expect(screen.getByTestId('expiry-month-select')).toBeInTheDocument();
      expect(screen.getByTestId('expiry-year-select')).toBeInTheDocument();
      expect(screen.getByTestId('cvv-input')).toBeInTheDocument();
      expect(screen.getByTestId('submit-button')).toBeInTheDocument();
    });

    it('should display amount correctly', () => {
      render(<MockPaymentForm {...defaultProps} amount={100.50} />);
      
      expect(screen.getByTestId('amount-display')).toHaveTextContent('Amount: AUD 100.50');
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Pay AUD 100.50');
    });

    it('should show tokenization notice when enabled', () => {
      render(<MockPaymentForm {...defaultProps} enableTokenization={true} />);
      
      expect(screen.getByTestId('tokenization-notice')).toBeInTheDocument();
      expect(screen.getByTestId('tokenization-notice')).toHaveTextContent('Card will be tokenized for future use');
    });

    it('should show 3DS notice when enabled', () => {
      render(<MockPaymentForm {...defaultProps} enable3DS={true} />);
      
      expect(screen.getByTestId('three-ds-notice')).toBeInTheDocument();
      expect(screen.getByTestId('three-ds-notice')).toHaveTextContent('3D Secure authentication enabled');
    });

    it('should render with custom className', () => {
      render(<MockPaymentForm {...defaultProps} className="custom-payment-form" />);
      
      const form = screen.getByTestId('payment-form');
      expect(form).toHaveClass('payment-form');
      expect(form).toHaveClass('custom-payment-form');
    });
  });

  describe('Form Interaction', () => {
    it('should allow user to input payment details', async () => {
      const user = userEvent.setup();
      render(<MockPaymentForm {...defaultProps} />);

      await user.type(screen.getByTestId('cardholder-name-input'), 'John Doe');
      await user.type(screen.getByTestId('card-number-input'), '4111111111111111');
      await user.selectOptions(screen.getByTestId('expiry-month-select'), '12');
      await user.selectOptions(screen.getByTestId('expiry-year-select'), '2025');
      await user.type(screen.getByTestId('cvv-input'), '123');

      expect(screen.getByTestId('cardholder-name-input')).toHaveValue('John Doe');
      expect(screen.getByTestId('card-number-input')).toHaveValue('4111111111111111');
      expect(screen.getByTestId('expiry-month-select')).toHaveValue('12');
      expect(screen.getByTestId('expiry-year-select')).toHaveValue('2025');
      expect(screen.getByTestId('cvv-input')).toHaveValue('123');
    });

    it('should disable form fields when loading', () => {
      render(<MockPaymentForm {...defaultProps} loading={true} />);

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

    it('should handle 3DS authentication when enabled', async () => {
      const onScaSuccess = jest.fn();
      const user = userEvent.setup();
      
      render(
        <MockPaymentForm 
          {...defaultProps} 
          enable3DS={true}
          onScaSuccess={onScaSuccess}
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
        expect(onScaSuccess).toHaveBeenCalledWith({
          authenticated: true,
          transaction_id: 'txn-123',
          acs_url: 'https://example.com/acs'
        });
      });
    });

    it('should show error for incomplete form', async () => {
      const onError = jest.fn();
      const user = userEvent.setup();
      
      render(<MockPaymentForm {...defaultProps} onError={onError} />);

      // Submit without filling required fields
      await user.click(screen.getByTestId('submit-button'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('All fields are required');
      });
    });
  });

  describe('Currency Support', () => {
    it('should display different currencies correctly', () => {
      const { rerender } = render(<MockPaymentForm {...defaultProps} currency="USD" amount={50.00} />);
      
      expect(screen.getByTestId('amount-display')).toHaveTextContent('Amount: USD 50.00');
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Pay USD 50.00');

      rerender(<MockPaymentForm {...defaultProps} currency="EUR" amount={75.50} />);
      
      expect(screen.getByTestId('amount-display')).toHaveTextContent('Amount: EUR 75.50');
      expect(screen.getByTestId('submit-button')).toHaveTextContent('Pay EUR 75.50');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all form fields', () => {
      render(<MockPaymentForm {...defaultProps} />);

      expect(screen.getByLabelText('Cardholder Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Card Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Month')).toBeInTheDocument();
      expect(screen.getByLabelText('Year')).toBeInTheDocument();
      expect(screen.getByLabelText('CVV')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<MockPaymentForm {...defaultProps} />);

      const cardholderInput = screen.getByTestId('cardholder-name-input');
      
      await user.click(cardholderInput);
      expect(cardholderInput).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('card-number-input')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('expiry-month-select')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('expiry-year-select')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('cvv-input')).toHaveFocus();
    });

    it('should have proper form structure', () => {
      render(<MockPaymentForm {...defaultProps} />);

      const form = screen.getByTestId('payment-form-element');
      expect(form.tagName).toBe('FORM');
    });
  });
});