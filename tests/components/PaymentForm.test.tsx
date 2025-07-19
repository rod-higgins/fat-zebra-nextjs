import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentForm } from '../../src/components/PaymentForm';
import { TEST_CARDS } from '../../src/types';

// Mock the utils
jest.mock('../../src/utils', () => ({
  ...jest.requireActual('../../src/utils'),
  generateReference: () => 'TEST-REF-123'
}));

describe('PaymentForm', () => {
  const mockOnSubmit = jest.fn();
  
  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  const defaultProps = {
    onSubmit: mockOnSubmit,
    amount: 25.00,
    currency: 'AUD' as const
  };

  it('renders all required fields', () => {
    render(<PaymentForm {...defaultProps} />);
    
    expect(screen.getByLabelText(/card holder name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/expiry/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cvv/i)).toBeInTheDocument();
  });

  it('shows amount field when showAmountField is true', () => {
    render(<PaymentForm {...defaultProps} showAmountField={true} />);
    
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
  });

  it('shows customer fields when requireCustomer is true', () => {
    render(<PaymentForm {...defaultProps} requireCustomer={true} />);
    
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it('formats card number input correctly', async () => {
    const user = userEvent.setup();
    render(<PaymentForm {...defaultProps} />);
    
    const cardNumberInput = screen.getByLabelText(/card number/i);
    await user.type(cardNumberInput, '4111111111111111');
    
    expect(cardNumberInput).toHaveValue('4111 1111 1111 1111');
  });

  it('formats expiry input correctly', async () => {
    const user = userEvent.setup();
    render(<PaymentForm {...defaultProps} />);
    
    const expiryInput = screen.getByLabelText(/expiry/i);
    await user.type(expiryInput, '1225');
    
    expect(expiryInput).toHaveValue('12/25');
  });

  it('validates required fields on submission', async () => {
    render(<PaymentForm {...defaultProps} />);
    
    const submitButton = screen.getByRole('button', { name: /pay/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/card holder name is required/i)).toBeInTheDocument();
    });
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(<PaymentForm {...defaultProps} />);
    
    // Fill in all required fields
    await user.type(screen.getByLabelText(/card holder name/i), 'John Doe');
    await user.type(screen.getByLabelText(/card number/i), TEST_CARDS.VISA_SUCCESS);
    await user.type(screen.getByLabelText(/expiry/i), '12/25');
    await user.type(screen.getByLabelText(/cvv/i), '123');
    
    const submitButton = screen.getByRole('button', { name: /pay/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        amount: 25.00,
        currency: 'AUD',
        reference: 'TEST-REF-123',
        cardDetails: {
          card_holder: 'John Doe',
          card_number: TEST_CARDS.VISA_SUCCESS.replace(/\s/g, ''),
          card_expiry: '12/25',
          cvv: '123'
        }
      });
    });
  });

  it('shows loading state when loading prop is true', () => {
    render(<PaymentForm {...defaultProps} loading={true} />);
    
    const submitButton = screen.getByRole('button');
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent(/processing/i);
  });

  it('displays card type icon', async () => {
    const user = userEvent.setup();
    render(<PaymentForm {...defaultProps} />);
    
    const cardNumberInput = screen.getByLabelText(/card number/i);
    await user.type(cardNumberInput, '4111');
    
    // Should show card icon (we use emoji in our implementation)
    expect(screen.getByTitle('visa')).toBeInTheDocument();
  });

  it('validates CVV length', async () => {
    const user = userEvent.setup();
    render(<PaymentForm {...defaultProps} />);
    
    const cvvInput = screen.getByLabelText(/cvv/i);
    await user.type(cvvInput, '12');
    
    fireEvent.blur(cvvInput);
    
    await waitFor(() => {
      expect(screen.getByText(/cvv must be 3 or 4 digits/i)).toBeInTheDocument();
    });
  });

  it('validates email when customer details are required', async () => {
    const user = userEvent.setup();
    render(<PaymentForm {...defaultProps} requireCustomer={true} />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'invalid-email');
    
    fireEvent.blur(emailInput);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
  });
});