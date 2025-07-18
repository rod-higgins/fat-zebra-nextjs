# API Reference - Fat Zebra Next.js Library

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Client API](#client-api)
- [React Components](#react-components)
- [React Hooks](#react-hooks)
- [Server-side Utilities](#server-side-utilities)
- [Types](#types)
- [Error Handling](#error-handling)

## Installation

```bash
npm install @fwc/fat-zebra-nextjs @fat-zebra/sdk
# or
yarn add @fwc/fat-zebra-nextjs @fat-zebra/sdk
```

## Configuration

### Environment Variables

Create a `.env.local` file in your project root:

```bash
FATZEBRA_USERNAME=your_username
FATZEBRA_TOKEN=your_token
NODE_ENV=development  # Use 'production' for live mode
```

### Client Configuration

```typescript
import { createFatZebraClient, Environment } from '@fwc/fat-zebra-nextjs';

const client = createFatZebraClient({
  username: process.env.FATZEBRA_USERNAME!,
  token: process.env.FATZEBRA_TOKEN!,
  isTestMode: process.env.NODE_ENV !== 'production',
  baseUrl: 'https://gateway.pmnts-sandbox.io' // Optional, defaults based on test mode
});
```

## Client API

### FatZebraClient

The main client for server-side Fat Zebra API interactions.

#### Constructor

```typescript
new FatZebraClient(config: FatZebraConfig)
```

**Parameters:**
- `config.username` (string): Your Fat Zebra username
- `config.token` (string): Your Fat Zebra token
- `config.isTestMode` (boolean): Whether to use sandbox mode
- `config.baseUrl` (string): Optional custom base URL

#### Purchase Methods

##### createPurchase()

```typescript
async createPurchase(request: PurchaseRequest): Promise<FatZebraResponse<TransactionResponse>>
```

Create a direct purchase with card details.

**Example:**
```typescript
const result = await client.createPurchase({
  amount: 10.00,
  currency: 'AUD',
  reference: 'ORDER-123',
  customer_ip: '192.168.1.1',
  card_details: {
    card_holder: 'John Doe',
    card_number: '4005550000000001',
    card_expiry: '12/25',
    cvv: '123'
  },
  customer: {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com'
  }
});
```

##### createPurchaseWithToken()

```typescript
async createPurchaseWithToken(
  cardToken: string,
  amount: number,
  reference: string,
  currency?: string,
  customerIp?: string,
  extra?: any
): Promise<FatZebraResponse<TransactionResponse>>
```

Create a purchase using a tokenized card.

**Example:**
```typescript
const result = await client.createPurchaseWithToken(
  'card_token_123',
  25.50,
  'ORDER-456',
  'AUD',
  '192.168.1.1'
);
```

##### getPurchase()

```typescript
async getPurchase(purchaseId: string): Promise<FatZebraResponse<TransactionResponse>>
```

Retrieve details of an existing purchase.

#### Authorization Methods

##### createAuthorization()

```typescript
async createAuthorization(request: AuthorizationRequest): Promise<FatZebraResponse<TransactionResponse>>
```

Create an authorization (funds hold) without capturing.

##### captureAuthorization()

```typescript
async captureAuthorization(authId: string, amount?: number): Promise<FatZebraResponse<TransactionResponse>>
```

Capture a previously authorized transaction.

#### Refund Methods

##### createRefund()

```typescript
async createRefund(request: RefundRequest): Promise<FatZebraResponse<TransactionResponse>>
```

Process a refund for a completed transaction.

**Example:**
```typescript
const refund = await client.createRefund({
  transaction_id: 'txn_123456',
  amount: 10.00,
  reference: 'REFUND-123'
});
```

#### Tokenization Methods

##### createToken()

```typescript
async createToken(request: TokenizeRequest): Promise<FatZebraResponse<TokenResponse>>
```

Create a secure token for card details.

## React Components

### PaymentForm

A complete payment form component with built-in validation and styling.

```typescript
import { PaymentForm } from '@fwc/fat-zebra-nextjs';

function CheckoutPage() {
  const handlePayment = async (paymentData) => {
    // Process payment
  };

  return (
    <PaymentForm
      onSubmit={handlePayment}
      amount={25.00}
      currency="AUD"
      loading={false}
      enableTokenization={true}
      onTokenizationSuccess={(token) => console.log('Token:', token)}
      className="custom-payment-form"
    />
  );
}
```

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onSubmit` | `(data: PaymentFormData) => Promise<void>` | Yes | Payment submission handler |
| `amount` | `number` | No | Payment amount (can be entered by user if not provided) |
| `currency` | `string` | No | Currency code (default: 'AUD') |
| `loading` | `boolean` | No | Show loading state |
| `enableTokenization` | `boolean` | No | Enable card tokenization |
| `onTokenizationSuccess` | `(token: string) => void` | No | Tokenization success callback |
| `className` | `string` | No | Custom CSS class |

## React Hooks

### usePayment

Hook for managing payment state and processing.

```typescript
import { usePayment } from '@fwc/fat-zebra-nextjs';

function PaymentComponent() {
  const { 
    loading, 
    error, 
    success, 
    processPayment, 
    processTokenization,
    reset 
  } = usePayment();

  const handleSubmit = async (paymentData) => {
    await processPayment({
      amount: 25.00,
      currency: 'AUD',
      reference: 'ORDER-123',
      cardDetails: paymentData.cardDetails
    });
  };

  if (success) {
    return <div>Payment successful!</div>;
  }

  return (
    <div>
      <PaymentForm onSubmit={handleSubmit} loading={loading} />
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

#### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `loading` | `boolean` | Whether a payment is in progress |
| `error` | `string \| null` | Error message if payment failed |
| `success` | `boolean` | Whether the last payment was successful |
| `processPayment` | `(data: PaymentRequest) => Promise<void>` | Process a payment |
| `processTokenization` | `(cardDetails: CardDetails) => Promise<string>` | Tokenize card details |
| `reset` | `() => void` | Reset payment state |

## Server-side Utilities

### API Route Helpers

For Next.js API routes:

```typescript
// pages/api/payments.ts or app/api/payments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient, handleFatZebraResponse } from '@fwc/fat-zebra-nextjs/server';

const client = createFatZebraClient({
  username: process.env.FATZEBRA_USERNAME!,
  token: process.env.FATZEBRA_TOKEN!,
  isTestMode: process.env.NODE_ENV !== 'production'
});

export async function POST(request: NextRequest) {
  try {
    const { amount, cardDetails, reference } = await request.json();
    
    const response = await client.createPurchase({
      amount,
      reference,
      currency: 'AUD',
      card_details: cardDetails,
      customer_ip: request.ip
    });
    
    const transaction = handleFatZebraResponse(response);
    
    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
```

## Types

### Core Types

```typescript
interface FatZebraConfig {
  username: string;
  token: string;
  isTestMode?: boolean;
  baseUrl?: string;
}

interface CardDetails {
  card_holder: string;
  card_number: string;
  card_expiry: string; // MM/YY format
  cvv: string;
}

interface Customer {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

interface PurchaseRequest {
  amount: number;
  currency: string;
  reference: string;
  customer_ip?: string;
  customer?: Customer;
  card_details?: CardDetails;
  card_token?: string;
  capture?: boolean;
  extra?: Record<string, any>;
}

interface TransactionResponse {
  id: string;
  authorization: string;
  amount: number;
  decimal_amount: number;
  currency: string;
  reference: string;
  successful: boolean;
  message: string;
  transaction_date: string;
  settlement_date?: string;
  card?: {
    token: string;
    card_number: string;
    card_type: string;
    card_holder: string;
    expiry_date: string;
  };
}

interface FatZebraResponse<T> {
  successful: boolean;
  response: T;
  errors: string[];
  test: boolean;
}
```

### Payment Form Types

```typescript
interface PaymentFormData {
  amount?: number;
  cardDetails: CardDetails;
  customer?: Customer;
}

interface PaymentFormProps {
  onSubmit: (data: PaymentFormData) => Promise<void>;
  amount?: number;
  currency?: string;
  loading?: boolean;
  enableTokenization?: boolean;
  onTokenizationSuccess?: (token: string) => void;
  className?: string;
}
```

## Error Handling

### FatZebraError

Custom error class for Fat Zebra API errors:

```typescript
class FatZebraError extends Error {
  errors: string[];
  response?: any;
  
  constructor(message: string, errors: string[] = [], response?: any);
}
```

### Error Handling Examples

```typescript
import { FatZebraError } from '@fwc/fat-zebra-nextjs';

try {
  const result = await client.createPurchase(purchaseData);
} catch (error) {
  if (error instanceof FatZebraError) {
    console.error('Fat Zebra API Error:', error.message);
    console.error('Details:', error.errors);
  } else {
    console.error('General Error:', error.message);
  }
}
```

## Constants

### Test Cards

```typescript
import { TEST_CARDS } from '@fwc/fat-zebra-nextjs';

// Successful test cards
TEST_CARDS.VISA_SUCCESS        // '4005550000000001'
TEST_CARDS.MASTERCARD_SUCCESS  // '5123456789012346'
TEST_CARDS.AMEX_SUCCESS       // '345678901234564'

// Decline test cards
TEST_CARDS.VISA_DECLINE       // '4005550000000019'
TEST_CARDS.MASTERCARD_DECLINE // '5123456789012353'
TEST_CARDS.AMEX_DECLINE      // '345678901234572'
```

### Supported Currencies

```typescript
import { CURRENCIES } from '@fwc/fat-zebra-nextjs';

CURRENCIES.AUD  // 'AUD'
CURRENCIES.USD  // 'USD'
CURRENCIES.NZD  // 'NZD'
CURRENCIES.GBP  // 'GBP'
CURRENCIES.EUR  // 'EUR'
```

## Environment Setup

### Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

### Production

```bash
# Build the library
npm run build

# Run tests with coverage
npm run test:coverage

# Prepare for publishing
npm run prepublishOnly
```

## Security Considerations

1. **Never store card details**: Always use tokenization for stored payments
2. **Environment variables**: Keep sensitive credentials in environment variables
3. **HTTPS only**: Only use in HTTPS environments in production
4. **PCI compliance**: Ensure your application meets PCI DSS requirements
5. **Input validation**: Always validate payment amounts and card details on the server side

## Support

- **Documentation**: [Fat Zebra API Docs](https://docs.fatzebra.com)
- **GitHub Issues**: [Report issues](https://github.com/rod-higgins/fat-zebra-nextjs/issues)
- **Fat Zebra Support**: [Contact Fat Zebra](https://www.fatzebra.com/support)