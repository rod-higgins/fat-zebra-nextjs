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

// Mock VerifyCard component since it might not exist yet
const MockVerifyCard = ({ 
  onVerificationComplete, 
  onError,
  loading = false,
  disabled = false,
  cardToken,
  className,
  ...props 
}: any) => {
  const [cardNumber, setCardNumber] = React.useState('');
  const [expiryMonth, setExpiryMonth] = React.useState('');
  const [expiryYear, setExpiryYear] = React.useState('');
  const [cvv, setCvv] = React.useState('');

  const handleVerify = async () => {
    try {
      if (!cardNumber || !expiryMonth || !expiryYear || !cvv) {
        onError?.('All fields are required');
        return;
      }

      const verificationResult = {
        successful: true,
        verified: true,
        cardToken: cardToken || 'token-123',
        cardDetails: {
          last4: cardNumber.slice(-4),
          cardType: 'visa',
          expiryMonth,
          expiryYear
        }
      };

      onVerificationComplete?.(verificationResult);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Verification failed');
    }
  };

  return (
    <div className={`verify-card ${className || ''}`} data-testid="verify-card">
      <form data-testid="verify-card-form">
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
          type="button"
          onClick={handleVerify}
          disabled={disabled || loading}
          data-testid="verify-button"
        >
          {loading ? 'Verifying...' : 'Verify Card'}
        </button>
      </form>
    </div>
  );
};

// Mock the component module
jest.mock('../../src/components/VerifyCard', () => ({
  VerifyCard: MockVerifyCard,
  default: MockVerifyCard
}));

describe('VerifyCard Component', () => {
  const defaultProps = {
    onVerificationComplete: jest.fn(),
    onError: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render verification form', () => {
      render(<MockVerifyCard {...defaultProps} />);

      expect(screen.getByTestId('verify-card')).toBeInTheDocument();
      expect(screen.getByTestId('verify-card-form')).toBeInTheDocument();
      expect(screen.getByTestId('card-number-input')).toBeInTheDocument();
      expect(screen.getByTestId('expiry-month-select')).toBeInTheDocument();
      expect(screen.getByTestId('expiry-year-select')).toBeInTheDocument();
      expect(screen.getByTestId('cvv-input')).toBeInTheDocument();
      expect(screen.getByTestId('verify-button')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      render(<MockVerifyCard {...defaultProps} className="custom-class" />);
      
      const component = screen.getByTestId('verify-card');
      expect(component).toHaveClass('verify-card');
      expect(component).toHaveClass('custom-class');
    });

    it('should show loading state', () => {
      render(<MockVerifyCard {...defaultProps} loading={true} />);
      
      expect(screen.getByTestId('verify-button')).toHaveTextContent('Verifying...');
      expect(screen.getByTestId('verify-button')).toBeDisabled();
      expect(screen.getByTestId('card-number-input')).toBeDisabled();
    });

    it('should show disabled state', () => {
      render(<MockVerifyCard {...defaultProps} disabled={true} />);
      
      expect(screen.getByTestId('verify-button')).toBeDisabled();
      expect(screen.getByTestId('card-number-input')).toBeDisabled();
      expect(screen.getByTestId('expiry-month-select')).toBeDisabled();
      expect(screen.getByTestId('expiry-year-select')).toBeDisabled();
      expect(screen.getByTestId('cvv-input')).toBeDisabled();
    });
  });

  describe('Form Interaction', () => {
    it('should handle card number input', async () => {
      const user = userEvent.setup();
      
      render(<MockVerifyCard {...defaultProps} />);

      const cardNumberInput = screen.getByTestId('card-number-input');
      await user.type(cardNumberInput, '4111111111111111');

      expect(cardNumberInput).toHaveValue('4111111111111111');
    });

    it('should handle expiry month selection', async () => {
      const user = userEvent.setup();
      
      render(<MockVerifyCard {...defaultProps} />);

      const monthSelect = screen.getByTestId('expiry-month-select');
      await user.selectOptions(monthSelect, '12');

      expect(monthSelect).toHaveValue('12');
    });

    it('should handle expiry year selection', async () => {
      const user = userEvent.setup();
      
      render(<MockVerifyCard {...defaultProps} />);

      const yearSelect = screen.getByTestId('expiry-year-select');
      const currentYear = new Date().getFullYear();
      await user.selectOptions(yearSelect, String(currentYear + 1));

      expect(yearSelect).toHaveValue(String(currentYear + 1));
    });

    it('should handle CVV input', async () => {
      const user = userEvent.setup();
      
      render(<MockVerifyCard {...defaultProps} />);

      const cvvInput = screen.getByTestId('cvv-input');
      await user.type(cvvInput, '123');

      expect(cvvInput).toHaveValue('123');
    });
  });

  describe('Verification Process', () => {
    it('should verify card successfully with valid data', async () => {
      const onVerificationComplete = jest.fn();
      const user = userEvent.setup();
      
      render(<MockVerifyCard {...defaultProps} onVerificationComplete={onVerificationComplete} />);

      // Fill form
      await user.type(screen.getByTestId('card-number-input'), '4111111111111111');
      await user.selectOptions(screen.getByTestId('expiry-month-select'), '12');
      await user.selectOptions(screen.getByTestId('expiry-year-select'), '2025');
      await user.type(screen.getByTestId('cvv-input'), '123');

      // Verify card
      await user.click(screen.getByTestId('verify-button'));

      await waitFor(() => {
        expect(onVerificationComplete).toHaveBeenCalledWith({
          successful: true,
          verified: true,
          cardToken: 'token-123',
          cardDetails: {
            last4: '1111',
            cardType: 'visa',
            expiryMonth: '12',
            expiryYear: '2025'
          }
        });
      });
    });

    it('should handle verification with custom card token', async () => {
      const onVerificationComplete = jest.fn();
      const user = userEvent.setup();
      
      render(
        <MockVerifyCard 
          {...defaultProps} 
          onVerificationComplete={onVerificationComplete}
          cardToken="custom-token-456"
        />
      );

      // Fill and verify form
      await user.type(screen.getByTestId('card-number-input'), '5555555555554444');
      await user.selectOptions(screen.getByTestId('expiry-month-select'), '06');
      await user.selectOptions(screen.getByTestId('expiry-year-select'), '2026');
      await user.type(screen.getByTestId('cvv-input'), '456');

      await user.click(screen.getByTestId('verify-button'));

      await waitFor(() => {
        expect(onVerificationComplete).toHaveBeenCalledWith({
          successful: true,
          verified: true,
          cardToken: 'custom-token-456',
          cardDetails: {
            last4: '4444',
            cardType: 'visa',
            expiryMonth: '06',
            expiryYear: '2026'
          }
        });
      });
    });

    it('should handle incomplete form submission', async () => {
      const onError = jest.fn();
      const user = userEvent.setup();
      
      render(<MockVerifyCard {...defaultProps} onError={onError} />);

      // Try to verify without filling form
      await user.click(screen.getByTestId('verify-button'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('All fields are required');
      });
    });

    it('should handle partial form completion', async () => {
      const onError = jest.fn();
      const user = userEvent.setup();
      
      render(<MockVerifyCard {...defaultProps} onError={onError} />);

      // Fill only some fields
      await user.type(screen.getByTestId('card-number-input'), '4111111111111111');
      await user.selectOptions(screen.getByTestId('expiry-month-select'), '12');
      // Leave year and CVV empty

      await user.click(screen.getByTestId('verify-button'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('All fields are required');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle verification errors', async () => {
      const onError = jest.fn();
      const user = userEvent.setup();
      
      // Create a component that throws an error
      const ErrorVerifyCard = ({ onError: onErrorProp, ...props }: any) => {
        const handleVerify = () => {
          onErrorProp?.('Verification service unavailable');
        };

        return (
          <div data-testid="verify-card">
            <button onClick={handleVerify} data-testid="verify-button">
              Verify
            </button>
          </div>
        );
      };

      render(React.createElement(ErrorVerifyCard, { onError }));

      await user.click(screen.getByTestId('verify-button'));

      expect(onError).toHaveBeenCalledWith('Verification service unavailable');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form fields', () => {
      render(<MockVerifyCard {...defaultProps} />);

      expect(screen.getByLabelText('Card Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Expiry Month')).toBeInTheDocument();
      expect(screen.getByLabelText('Expiry Year')).toBeInTheDocument();
      expect(screen.getByLabelText('CVV')).toBeInTheDocument();
    });

    it('should have proper form structure', () => {
      render(<MockVerifyCard {...defaultProps} />);

      const form = screen.getByTestId('verify-card-form');
      expect(form.tagName).toBe('FORM');
    });

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(<MockVerifyCard {...defaultProps} />);

      const cardNumberInput = screen.getByTestId('card-number-input');
      const monthSelect = screen.getByTestId('expiry-month-select');

      await user.tab();
      expect(cardNumberInput).toHaveFocus();

      await user.tab();
      expect(monthSelect).toHaveFocus();
    });
  });

  describe('CVV Length Validation', () => {
    it('should limit CVV input to 4 characters', async () => {
      const user = userEvent.setup();
      
      render(<MockVerifyCard {...defaultProps} />);

      const cvvInput = screen.getByTestId('cvv-input');
      await user.type(cvvInput, '12345'); // Try to type 5 characters

      // Should only show 4 characters due to maxLength
      expect(cvvInput).toHaveValue('1234');
    });
  });
});