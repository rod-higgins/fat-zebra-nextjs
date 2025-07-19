import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentForm } from '../../src/components/PaymentForm';
import { PaymentFormProps } from '../../src/types';
import { createMockCardDetails } from '../setup';

// Mock the Fat Zebra SDK import
jest.mock('@fat-zebra/sdk', () => ({
  FatZebra: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    verify: jest.fn().mockResolvedValue({
      successful: true,
      data: {
        eci: '05',
        cavv: 'test-cavv',
        xid: 'test-xid'
      }
    })
  }))
}));

describe('PaymentForm', () => {
  const defaultProps: PaymentFormProps = {
    onSubmit: jest.fn(),
    amount: 10.00,
    currency: 'AUD',
    loading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render payment form with required fields', () => {
      render(<PaymentForm {...defaultProps} />);

      expect(screen.getByLabelText(/card holder name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/expiry date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cvv/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /pay/i })).toBeInTheDocument();
    });

    it('should display amount in button when provided', () => {
      render(<PaymentForm {...defaultProps} amount={25.50} />);
      
      expect(screen.getByRole('button', { name: /pay aud 25\.50/i })).toBeInTheDocument();
    });

    it('should show amount field when showAmountField is true', () => {
      render(<PaymentForm {...defaultProps} showAmountField={true} />);
      
      expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    });

    it('should show customer fields when requireCustomer is true', () => {
      render(<PaymentForm {...defaultProps} requireCustomer={true} />);
      
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for empty required fields', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /pay/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/card holder name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/invalid card number/i)).toBeInTheDocument();
        expect(screen.getByText(/please enter expiry as mm\/yy/i)).toBeInTheDocument();
        expect(screen.getByText(/please enter a valid cvv/i)).toBeInTheDocument();
      });
    });

    it('should validate card number format', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const cardNumberInput = screen.getByLabelText(/card number/i);
      await user.type(cardNumberInput, '1234567890123456'); // Invalid card number

      const submitButton = screen.getByRole('button', { name: /pay/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid card number/i)).toBeInTheDocument();
      });
    });

    it('should validate expiry date format and future date', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const expiryInput = screen.getByLabelText(/expiry date/i);
      
      // Test invalid format
      await user.type(expiryInput, '1325');
      await user.tab(); // Trigger blur event
      
      await waitFor(() => {
        expect(screen.getByText(/please enter expiry as mm\/yy/i)).toBeInTheDocument();
      });

      // Clear and test expired date
      await user.clear(expiryInput);
      await user.type(expiryInput, '01/20');
      
      const submitButton = screen.getByRole('button', { name: /pay/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/card has expired/i)).toBeInTheDocument();
      });
    });

    it('should validate CVV length', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const cvvInput = screen.getByLabelText(/cvv/i);
      await user.type(cvvInput, '12'); // Too short

      const submitButton = screen.getByRole('button', { name: /pay/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid cvv/i)).toBeInTheDocument();
      });
    });

    it('should validate email when customer details required', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} requireCustomer={true} />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'invalid-email');

      const submitButton = screen.getByRole('button', { name: /pay/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Interaction', () => {
    it('should format card number as user types', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const cardNumberInput = screen.getByLabelText(/card number/i) as HTMLInputElement;
      await user.type(cardNumberInput, '4005550000000001');

      expect(cardNumberInput.value).toBe('4005 5500 0000 0001');
    });

    it('should format expiry date as user types', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const expiryInput = screen.getByLabelText(/expiry date/i) as HTMLInputElement;
      await user.type(expiryInput, '1225');

      expect(expiryInput.value).toBe('12/25');
    });

    it('should detect and display card type', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const cardNumberInput = screen.getByLabelText(/card number/i);
      await user.type(cardNumberInput, '4005');

      await waitFor(() => {
        expect(screen.getByText(/visa/i)).toBeInTheDocument();
      });
    });

    it('should limit CVV length to 4 characters', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const cvvInput = screen.getByLabelText(/cvv/i) as HTMLInputElement;
      await user.type(cvvInput, '12345');

      expect(cvvInput.value).toBe('1234');
    });

    it('should clear field errors when user starts typing', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      // First trigger validation error
      const submitButton = screen.getByRole('button', { name: /pay/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/card holder name is required/i)).toBeInTheDocument();
      });

      // Then start typing in the field
      const cardHolderInput = screen.getByLabelText(/card holder name/i);
      await user.type(cardHolderInput, 'J');

      await waitFor(() => {
        expect(screen.queryByText(/card holder name is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with correct data for valid form', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
      
      render(<PaymentForm {...defaultProps} onSubmit={mockOnSubmit} />);

      // Fill out the form
      await user.type(screen.getByLabelText(/card holder name/i), 'John Doe');
      await user.type(screen.getByLabelText(/card number/i), '4005550000000001');
      await user.type(screen.getByLabelText(/expiry date/i), '1225');
      await user.type(screen.getByLabelText(/cvv/i), '123');

      const submitButton = screen.getByRole('button', { name: /pay/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          amount: 10.00,
          currency: 'AUD',
          reference: expect.stringMatching(/^PAY-\d+-[A-Z0-9]+$/),
          cardDetails: {
            card_holder: 'John Doe',
            card_number: '4005550000000001',
            card_expiry: '12/25',
            cvv: '123'
          },
          customer: undefined
        });
      });
    });

    it('should include customer data when requireCustomer is true', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
      
      render(<PaymentForm {...defaultProps} onSubmit={mockOnSubmit} requireCustomer={true} />);

      // Fill out form including customer details
      await user.type(screen.getByLabelText(/card holder name/i), 'John Doe');
      await user.type(screen.getByLabelText(/card number/i), '4005550000000001');
      await user.type(screen.getByLabelText(/expiry date/i), '1225');
      await user.type(screen.getByLabelText(/cvv/i), '123');
      await user.type(screen.getByLabelText(/first name/i), 'John');
      await user.type(screen.getByLabelText(/last name/i), 'Doe');
      await user.type(screen.getByLabelText(/email address/i), 'john@example.com');

      const submitButton = screen.getByRole('button', { name: /pay/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            customer: {
              first_name: 'John',
              last_name: 'Doe',
              email: 'john@example.com',
              phone: '',
              address: '',
              city: '',
              state: '',
              postcode: '',
              country: 'AU'
            }
          })
        );
      });
    });

    it('should use custom reference when provided', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
      
      render(<PaymentForm {...defaultProps} onSubmit={mockOnSubmit} />);

      // Fill out form with custom reference
      await user.type(screen.getByLabelText(/card holder name/i), 'John Doe');
      await user.type(screen.getByLabelText(/card number/i), '4005550000000001');
      await user.type(screen.getByLabelText(/expiry date/i), '1225');
      await user.type(screen.getByLabelText(/cvv/i), '123');
      await user.type(screen.getByLabelText(/reference/i), 'CUSTOM-REF-123');

      const submitButton = screen.getByRole('button', { name: /pay/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            reference: 'CUSTOM-REF-123'
          })
        );
      });
    });
  });

  describe('Loading States', () => {
    it('should disable form when loading prop is true', () => {
      render(<PaymentForm {...defaultProps} loading={true} />);

      expect(screen.getByLabelText(/card holder name/i)).toBeDisabled();
      expect(screen.getByLabelText(/card number/i)).toBeDisabled();
      expect(screen.getByLabelText(/expiry date/i)).toBeDisabled();
      expect(screen.getByLabelText(/cvv/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled();
    });

    it('should show processing state during submission', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<PaymentForm {...defaultProps} onSubmit={mockOnSubmit} />);

      // Fill out valid form
      await user.type(screen.getByLabelText(/card holder name/i), 'John Doe');
      await user.type(screen.getByLabelText(/card number/i), '4005550000000001');
      await user.type(screen.getByLabelText(/expiry date/i), '1225');
      await user.type(screen.getByLabelText(/cvv/i), '123');

      const submitButton = screen.getByRole('button', { name: /pay/i });
      await user.click(submitButton);

      // Should show processing state
      expect(screen.getByRole('button', { name: /processing/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled();

      // Wait for submission to complete
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display general error when onSubmit rejects', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockRejectedValue(new Error('Payment failed'));
      
      render(<PaymentForm {...defaultProps} onSubmit={mockOnSubmit} />);

      // Fill out valid form
      await user.type(screen.getByLabelText(/card holder name/i), 'John Doe');
      await user.type(screen.getByLabelText(/card number/i), '4005550000000001');
      await user.type(screen.getByLabelText(/expiry date/i), '1225');
      await user.type(screen.getByLabelText(/cvv/i), '123');

      const submitButton = screen.getByRole('button', { name: /pay/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/payment failed/i)).toBeInTheDocument();
      });
    });

    it('should prevent multiple submissions', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<PaymentForm {...defaultProps} onSubmit={mockOnSubmit} />);

      // Fill out valid form
      await user.type(screen.getByLabelText(/card holder name/i), 'John Doe');
      await user.type(screen.getByLabelText(/card number/i), '4005550000000001');
      await user.type(screen.getByLabelText(/expiry date/i), '1225');
      await user.type(screen.getByLabelText(/cvv/i), '123');

      const submitButton = screen.getByRole('button', { name: /pay/i });
      
      // Click multiple times quickly
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Should only be called once
      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('3DS Integration', () => {
    it('should initialize Fat Zebra SDK when 3DS enabled', () => {
      render(
        <PaymentForm 
          {...defaultProps} 
          enable3DS={true}
          accessToken="test-token"
          username="test-username"
        />
      );

      // The SDK should be imported and initialized
      // This is tested by the mock function being called
      expect(require('@fat-zebra/sdk').FatZebra).toHaveBeenCalled();
    });

    it('should show 3DS security notice when enabled', () => {
      render(
        <PaymentForm 
          {...defaultProps} 
          enable3DS={true}
          accessToken="test-token"
          username="test-username"
        />
      );

      expect(screen.getByText(/3d secure authentication enabled/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels and structure', () => {
      render(<PaymentForm {...defaultProps} />);

      // Check that all inputs have labels
      expect(screen.getByLabelText(/card holder name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/card number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/expiry date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/cvv/i)).toBeInTheDocument();

      // Check for required field indicators
      expect(screen.getAllByText('*')).toHaveLength(4); // 4 required fields
    });

    it('should associate error messages with fields', async () => {
      const user = userEvent.setup();
      render(<PaymentForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /pay/i });
      await user.click(submitButton);

      await waitFor(() => {
        const cardHolderInput = screen.getByLabelText(/card holder name/i);
        const errorElement = screen.getByText(/card holder name is required/i);
        
        expect(cardHolderInput).toHaveAttribute('aria-invalid');
        expect(errorElement).toBeInTheDocument();
      });
    });
  });
});