/**
 * useOAuthPayment Hook - Usage Example (CORRECTED)
 * 
 * This example demonstrates how to use the useOAuthPayment hook
 * with the actual PaymentForm component props that exist in the project.
 */

import React, { useEffect, useState } from 'react';
import { useOAuthPayment } from '@fwcgovau/fat-zebra-nextjs';
import type { OAuthPaymentData } from '@fwcgovau/fat-zebra-nextjs';

interface SecureCheckoutProps {
  clientId: string;
  username: string;
  amount: number;
  currency?: string;
}

// CSS styles as a const object (works in any React project)
const styles = {
  secureCheckout: {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  formGroup: {
    marginBottom: '15px'
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold' as 'bold'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '16px',
    boxSizing: 'border-box' as 'border-box'
  },
  submitButton: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer'
  },
  submitButtonDisabled: {
    width: '100%',
    padding: '15px',
    backgroundColor: '#ccc',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'not-allowed'
  },
  errorMessage: {
    color: '#dc3545',
    padding: '10px',
    border: '1px solid #dc3545',
    borderRadius: '4px',
    marginTop: '15px'
  },
  successMessage: {
    color: '#28a745',
    padding: '20px',
    border: '1px solid #28a745',
    borderRadius: '4px',
    textAlign: 'center' as 'center'
  },
  threeDSChallenge: {
    textAlign: 'center' as 'center',
    padding: '20px'
  },
  paymentInfo: {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px'
  }
};

export function SecureCheckout({ clientId, username, amount, currency = 'AUD' }: SecureCheckoutProps) {
  const [accessToken, setAccessToken] = useState<string>('');
  const [tokenLoading, setTokenLoading] = useState(true);
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    email: '',
    firstName: '',
    lastName: ''
  });

  // Initialize OAuth payment hook
  const {
    loading,
    error,
    success,
    threeDSResult,
    isAuthenticated,
    processPayment,
    handle3DS2Challenge,
    resetState
  } = useOAuthPayment(accessToken, username, {
    enableTokenization: true,
    enable3DS: true,
    environment: 'sandbox', // or 'live' for production
    clientId,
    onPaymentSuccess: (result) => {
      console.log('Payment successful:', result);
    },
    onPaymentError: (error) => {
      console.error('Payment failed:', error);
    },
    on3DSChallenge: (challengeData) => {
      console.log('3DS Challenge required:', challengeData);
      // Handle 3DS challenge UI here
    }
  });

  // Fetch OAuth access token on component mount
  useEffect(() => {
    const fetchAccessToken = async () => {
      setTokenLoading(true);
      try {
        const response = await fetch('/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, username })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch access token');
        }

        const data = await response.json();
        setAccessToken(data.accessToken);
      } catch (err) {
        console.error('Failed to get access token:', err);
      } finally {
        setTokenLoading(false);
      }
    };

    if (clientId && username) {
      fetchAccessToken();
    }
  }, [clientId, username]);

  // Handle payment form submission (manual form handling since PaymentForm doesn't have onSubmit)
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      alert('Not authenticated. Please wait for authentication to complete.');
      return;
    }

    try {
      const paymentData: OAuthPaymentData = {
        amount,
        currency,
        reference: `order-${Date.now()}`,
        cardDetails: {
          card_holder: formData.cardholderName,
          card_number: formData.cardNumber.replace(/\s/g, ''), // Remove spaces
          card_expiry: formData.expiryDate,
          cvv: formData.cvv
        },
        customer: {
          email: formData.email,
          first_name: formData.firstName,
          last_name: formData.lastName
        },
        threeDSMethod: true, // Enable 3DS method
        metadata: {
          source: 'oauth_example'
        }
      };

      const result = await processPayment(paymentData);
      console.log('Payment processed:', result);
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  // Handle 3DS challenge completion
  const handle3DSComplete = async (challengeResult: any) => {
    try {
      await handle3DS2Challenge(challengeResult);
    } catch (error) {
      console.error('3DS challenge failed:', error);
    }
  };

  // Show loading state while fetching token
  if (tokenLoading) {
    return <div style={styles.secureCheckout}>Loading payment system...</div>;
  }

  // Show authentication error
  if (!isAuthenticated && accessToken) {
    return <div style={styles.secureCheckout}>Authentication failed. Please check your credentials.</div>;
  }

  // Show success state
  if (success) {
    return (
      <div style={styles.successMessage}>
        <h3>Payment Successful!</h3>
        {threeDSResult && (
          <p>Authentication Status: {threeDSResult.status}</p>
        )}
        <button onClick={resetState} style={styles.submitButton}>Make Another Payment</button>
      </div>
    );
  }

  // Show 3DS challenge if required
  if (threeDSResult?.status === '3DS_CHALLENGE' && threeDSResult.challengeUrl) {
    return (
      <div style={styles.threeDSChallenge}>
        <h3>Authentication Required</h3>
        <p>Please complete 3D Secure authentication...</p>
        <iframe
          src={threeDSResult.challengeUrl}
          width="400"
          height="600"
          title="3D Secure Challenge"
          onLoad={() => {
            // Handle iframe load if needed
          }}
        />
        <button onClick={resetState} style={styles.submitButton}>Cancel</button>
      </div>
    );
  }

  // Main payment form (Custom form since PaymentForm component has limited props)
  return (
    <div style={styles.secureCheckout}>
      <h2>Secure Payment</h2>
      
      <div style={styles.paymentInfo}>
        <p>Amount: {currency} {amount.toFixed(2)}</p>
        <p>Authentication: {isAuthenticated ? '✓ Authenticated' : '✗ Not Authenticated'}</p>
      </div>

      <form onSubmit={handlePayment}>
        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="firstName">First Name</label>
          <input
            style={styles.input}
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({...prev, firstName: e.target.value}))}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="lastName">Last Name</label>
          <input
            style={styles.input}
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({...prev, lastName: e.target.value}))}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="email">Email</label>
          <input
            style={styles.input}
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="cardholderName">Cardholder Name</label>
          <input
            style={styles.input}
            id="cardholderName"
            type="text"
            value={formData.cardholderName}
            onChange={(e) => setFormData(prev => ({...prev, cardholderName: e.target.value}))}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="cardNumber">Card Number</label>
          <input
            style={styles.input}
            id="cardNumber"
            type="text"
            value={formData.cardNumber}
            onChange={(e) => {
              // Format card number with spaces
              const formatted = e.target.value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
              setFormData(prev => ({...prev, cardNumber: formatted}));
            }}
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="expiryDate">Expiry Date</label>
          <input
            style={styles.input}
            id="expiryDate"
            type="text"
            value={formData.expiryDate}
            onChange={(e) => {
              // Format expiry date MM/YY
              let value = e.target.value.replace(/\D/g, '');
              if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
              }
              setFormData(prev => ({...prev, expiryDate: value}));
            }}
            placeholder="MM/YY"
            maxLength={5}
            required
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label} htmlFor="cvv">CVV</label>
          <input
            style={styles.input}
            id="cvv"
            type="text"
            value={formData.cvv}
            onChange={(e) => setFormData(prev => ({...prev, cvv: e.target.value.replace(/\D/g, '')}))}
            placeholder="123"
            maxLength={4}
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={loading || !isAuthenticated}
          style={loading || !isAuthenticated ? styles.submitButtonDisabled : styles.submitButton}
        >
          {loading ? 'Processing...' : `Pay ${currency} ${amount.toFixed(2)}`}
        </button>
      </form>

      {error && (
        <div style={styles.errorMessage}>
          <p>Error: {error}</p>
          <button onClick={resetState} style={styles.submitButton}>Try Again</button>
        </div>
      )}
    </div>
  );
}