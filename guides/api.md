# API Reference

Complete API reference for `@fwcgovau/fat-zebra-nextjs`.

## Table of Contents

- [Client-side Components](#client-side-components)
- [React Hooks](#react-hooks)
- [Server-side Functions](#server-side-functions)
- [Types and Interfaces](#types-and-interfaces)
- [Utilities](#utilities)
- [Error Handling](#error-handling)

## Client-side Components

### PaymentForm

A complete payment form component with built-in validation and 3DS2 support.

```typescript
import { PaymentForm } from '@fwcgovau/fat-zebra-nextjs';

<PaymentForm
  onSubmit={handlePayment}
  loading={isProcessing}
  error={errorMessage}
  className="custom-payment-form"
  showCardholderName={true}
  validateOnBlur={true}
  autoComplete={true}
  threeDSConfig={{
    browserInfo: {
      colorDepth: 24,
      javaEnabled: false,
      language: 'en-US',
      screenHeight: 1080,
      screenWidth: 1920,
      timezone: -300,
      userAgent: navigator.userAgent
    }
  }}
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSubmit` | `(data: PaymentFormData) => Promise<void>` | Required | Payment submission handler |
| `loading` | `boolean` | `false` | Show loading state |
| `error` | `string \| null` | `null` | Error message to display |
| `className` | `string` | `""` | CSS class name |
| `showCardholderName` | `boolean` | `true` | Show cardholder name field |
| `validateOnBlur` | `boolean` | `true` | Validate fields on blur |
| `autoComplete` | `boolean` | `true` | Enable browser autocomplete |
| `threeDSConfig` | `ThreeDSConfig` | `undefined` | 3DS2 configuration |

### CardInput

Individual card input component for custom forms.

```typescript
import { CardInput } from '@fwcgovau/fat-zebra-nextjs';

<CardInput
  value={cardNumber}
  onChange={setCardNumber}
  onValidChange={setIsValid}
  placeholder="1234 5678 9012 3456"
  className="card-input"
/>
```

## React Hooks

### usePayment

Basic payment processing hook.

```typescript
const {
  processPayment,
  loading,
  error,
  success,
  reset
} = usePayment();
```

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `processPayment` | `(data: PaymentData) => Promise<PaymentResult>` | Process payment function |
| `loading` | `boolean` | Payment processing state |
| `error` | `string \| null` | Error message |
| `success` | `boolean` | Success state |
| `reset` | `() => void` | Reset hook state |

### useOAuthPayment

OAuth-enabled payment processing with 3DS2 support.

```typescript
const {
  processPayment,
  handle3DS2Challenge,
  loading,
  error,
  threeDSResult,
  isAuthenticated
} = useOAuthPayment({
  clientId: 'your-client-id',
  environment: 'sandbox'
});
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clientId` | `string` | Yes | OAuth client ID |
| `environment` | `'sandbox' \| 'live'` | Yes | Environment |

#### Returns

| Property | Type | Description |
|----------|------|-------------|
| `processPayment` | `(data: OAuthPaymentData) => Promise<PaymentResult>` | OAuth payment function |
| `handle3DS2Challenge` | `(result: PaymentResult) => Promise<void>` | Handle 3DS2 challenge |
| `loading` | `boolean` | Processing state |
| `error` | `string \| null` | Error message |
| `threeDSResult` | `ThreeDSResult \| null` | 3DS2 result |
| `isAuthenticated` | `boolean` | OAuth authentication state |

### usePaymentEvents

Payment event subscription hook.

```typescript
const {
  events,
  subscribe,
  unsubscribe,
  clearEvents
} = usePaymentEvents();
```

## Server-side Functions

### createFatZebraClient

Create a server-side Fat Zebra client.

```typescript
import { createFatZebraClient } from '@fwcgovau/fat-zebra-nextjs/server';

const client = createFatZebraClient({
  username: 'your-username',
  token: 'your-token',
  sharedSecret: 'your-shared-secret',
  environment: 'sandbox'
});
```

#### Configuration

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `username` | `string` | Yes | Fat Zebra username |
| `token` | `string` | Yes | Fat Zebra token |
| `sharedSecret` | `string` | No | Shared secret for verification |
| `environment` | `'sandbox' \| 'live'` | Yes | Environment |

### Client Methods

#### Tokenization

```typescript
// Tokenize a card
const tokenResult = await client.tokenize({
  card_number: '4005550000000001',
  card_expiry: '12/25',
  cvv: '123',
  card_holder: 'John Doe'
});
```

#### Payments

```typescript
// Process a payment
const paymentResult = await client.purchase({
  amount: 1000, // $10.00 in cents
  currency: 'AUD',
  card_token: 'token_123',
  reference: 'ORDER-123',
  customer_ip: '192.168.1.1'
});

// Process a refund
const refundResult = await client.refund({
  transaction_id: 'txn_123',
  amount: 500, // Partial refund
  reference: 'REFUND-123'
});
```

#### Subscriptions

```typescript
// Create a subscription
const subscription = await client.createSubscription({
  customer_id: 'cust_123',
  plan_id: 'plan_456',
  card_token: 'token_789'
});

// Update a subscription
const updated = await client.updateSubscription('sub_123', {
  amount: 2000,
  frequency: 'Monthly'
});

// Cancel a subscription
await client.cancelSubscription('sub_123');
```

## Types and Interfaces

### PaymentFormData

```typescript
interface PaymentFormData {
  card_number: string;
  card_expiry: string;
  cvv: string;
  card_holder?: string;
  amount: number;
  currency: string;
  reference: string;
}
```

### PaymentResult

```typescript
interface PaymentResult {
  successful: boolean;
  response: {
    id: string;
    amount: number;
    currency: string;
    reference: string;
    message: string;
    authorization: string;
    card_number: string;
    card_holder: string;
  };
  errors?: string[];
  test: boolean;
  threeds_required?: boolean;
  threeds_redirect_url?: string;
}
```

### ThreeDSConfig

```typescript
interface ThreeDSConfig {
  browserInfo: {
    acceptHeader?: string;
    colorDepth: number;
    javaEnabled: boolean;
    language: string;
    screenHeight: number;
    screenWidth: number;
    timezone: number;
    userAgent: string;
  };
}
```

### FatZebraError

```typescript
class FatZebraError extends Error {
  code: string;
  details?: any;
  
  constructor(message: string, code: string, details?: any);
}
```

## Utilities

### Card Validation

```typescript
import { validateCard, formatCardNumber, getCardType } from '@fwcgovau/fat-zebra-nextjs/utils';

// Validate card number
const isValid = validateCard('4005550000000001');

// Format card number with spaces
const formatted = formatCardNumber('4005550000000001');
// Returns: "4005 5500 0000 0001"

// Get card type
const cardType = getCardType('4005550000000001');
// Returns: "visa"
```

### Amount Formatting

```typescript
import { formatAmount, parseAmount } from '@fwcgovau/fat-zebra-nextjs/utils';

// Format cents to dollars
const formatted = formatAmount(1000, 'AUD');
// Returns: "$10.00"

// Parse dollars to cents
const cents = parseAmount('$10.00');
// Returns: 1000
```

## Error Handling

### Error Types

The library provides specific error types for different scenarios:

```typescript
import { FatZebraError, ValidationError, NetworkError } from '@fwcgovau/fat-zebra-nextjs';

try {
  await processPayment(paymentData);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
    console.log('Validation failed:', error.details);
  } else if (error instanceof NetworkError) {
    // Handle network errors
    console.log('Network error:', error.message);
  } else if (error instanceof FatZebraError) {
    // Handle Fat Zebra API errors
    console.log('API error:', error.code, error.message);
  }
}
```

### Common Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `INVALID_CARD` | Invalid card number | Check card number format |
| `EXPIRED_CARD` | Card has expired | Request new card details |
| `INSUFFICIENT_FUNDS` | Insufficient funds | Try a different payment method |
| `DECLINED` | Transaction declined | Contact card issuer |
| `NETWORK_ERROR` | Network connectivity issue | Retry the request |
| `VALIDATION_ERROR` | Input validation failed | Check required fields |

### Error Response Format

```typescript
interface ErrorResponse {
  successful: false;
  response: {
    message: string;
    errors: string[];
  };
  test: boolean;
}
```

## Environment Configuration

### Development

```typescript
const config = {
  environment: 'sandbox',
  apiUrl: 'https://gateway.sandbox.fatzebra.com.au',
  oauthUrl: 'https://auth.sandbox.fatzebra.com.au'
};
```

### Production

```typescript
const config = {
  environment: 'live',
  apiUrl: 'https://gateway.fatzebra.com.au',
  oauthUrl: 'https://auth.fatzebra.com.au'
};
```

## Rate Limits

Fat Zebra API has rate limits:

- **Sandbox**: 1000 requests per minute
- **Live**: 500 requests per minute

The library automatically handles rate limiting with exponential backoff retry logic.

## Support

For additional help:

- [Fat Zebra API Documentation](https://docs.fatzebra.com)
- [GitHub Issues](https://github.com/rod-higgins/fat-zebra-nextjs/issues)
- [Fat Zebra Support](https://www.fatzebra.com/support)