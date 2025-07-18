# Migration Guide - Fat Zebra Next.js Library

This guide will help you migrate from older Fat Zebra implementations or custom integrations to the new `@fwc/fat-zebra-nextjs` library.

## Table of Contents

- [Overview](#overview)
- [Breaking Changes](#breaking-changes)
- [Migration Scenarios](#migration-scenarios)
- [Step-by-Step Migration](#step-by-step-migration)
- [Code Examples](#code-examples)
- [Troubleshooting](#troubleshooting)

## Overview

The new `@fwc/fat-zebra-nextjs` library provides:

- **Official SDK Integration**: Built on top of `@fat-zebra/sdk`
- **Type Safety**: Full TypeScript support
- **React Components**: Pre-built payment forms and hooks
- **Server-side Utilities**: Next.js API route helpers
- **Better Error Handling**: Comprehensive error types and handling
- **Modern Architecture**: ES modules, tree-shaking, and optimized builds

## Breaking Changes

### 1. Package Name Change

**Before:**
```typescript
import { SomeComponent } from '@your-org/fat-zebra-nextjs';
```

**After:**
```typescript
import { SomeComponent } from '@fwc/fat-zebra-nextjs';
```

### 2. Client Initialization

**Before (Custom Implementation):**
```typescript
const client = new FatZebra({
  username: 'username',
  token: 'token',
  sandbox: true
});
```

**After:**
```typescript
import { createFatZebraClient } from '@fwc/fat-zebra-nextjs';

const client = createFatZebraClient({
  username: 'username',
  token: 'token',
  isTestMode: true,
  baseUrl: 'https://gateway.pmnts-sandbox.io' // Optional
});
```

### 3. API Response Structure

**Before:**
```typescript
// Custom response handling
const response = await client.purchase(data);
if (response.status === 'success') {
  // Handle success
}
```

**After:**
```typescript
import { handleFatZebraResponse, FatZebraError } from '@fwc/fat-zebra-nextjs';

try {
  const response = await client.createPurchase(data);
  const transaction = handleFatZebraResponse(response);
  // Handle success
} catch (error) {
  if (error instanceof FatZebraError) {
    // Handle Fat Zebra specific errors
  }
}
```

### 4. React Component Props

**Before (Custom Components):**
```typescript
<PaymentForm
  onSuccess={(result) => {}}
  onError={(error) => {}}
  amount={100}
/>
```

**After:**
```typescript
<PaymentForm
  onSubmit={async (data) => {
    // Process payment
  }}
  amount={100}
  loading={false}
  enableTokenization={true}
/>
```

## Migration Scenarios

### Scenario 1: Direct Fat Zebra API Usage

If you're currently making direct API calls to Fat Zebra:

**Before:**
```typescript
// Direct API calls
const response = await fetch('https://gateway.pmnts.io/v1.0/purchases', {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${btoa(`${username}:${token}`)}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(purchaseData)
});
```

**After:**
```typescript
import { createFatZebraClient } from '@fwc/fat-zebra-nextjs';

const client = createFatZebraClient({ username, token, isTestMode: true });
const response = await client.createPurchase(purchaseData);
```

### Scenario 2: Custom React Components

If you have custom payment forms:

**Before:**
```typescript
function PaymentForm({ onSubmit }) {
  const [cardNumber, setCardNumber] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Custom payment logic
    setLoading(false);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input 
        value={cardNumber} 
        onChange={(e) => setCardNumber(e.target.value)}
        placeholder="Card Number"
      />
      <button disabled={loading}>
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}
```

**After:**
```typescript
import { PaymentForm, usePayment } from '@fwc/fat-zebra-nextjs';

function PaymentComponent() {
  const { loading, error, success, processPayment } = usePayment();
  
  const handlePayment = async (paymentData) => {
    await processPayment({
      amount: 25.00,
      currency: 'AUD',
      reference: 'ORDER-123',
      cardDetails: paymentData.cardDetails
    });
  };

  if (success) return <div>Payment successful!</div>;

  return (
    <div>
      <PaymentForm onSubmit={handlePayment} loading={loading} />
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

### Scenario 3: Next.js API Routes

**Before:**
```typescript
// pages/api/payments.js
export default async function handler(req, res) {
  const { amount, cardDetails } = req.body;
  
  try {
    const response = await fetch('https://gateway.pmnts.io/v1.0/purchases', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount,
        currency: 'AUD',
        card_details: cardDetails,
        reference: 'ORDER-' + Date.now()
      })
    });
    
    const result = await response.json();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

**After:**
```typescript
// app/api/payments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createFatZebraClient, handleFatZebraResponse, FatZebraError } from '@fwc/fat-zebra-nextjs/server';

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
    if (error instanceof FatZebraError) {
      return NextResponse.json(
        { error: error.message, details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Step-by-Step Migration

### Step 1: Install the New Library

```bash
# Remove old dependencies
npm uninstall old-fat-zebra-package

# Install new library
npm install @fwc/fat-zebra-nextjs @fat-zebra/sdk
```

### Step 2: Update Environment Variables

Create or update your `.env.local` file:

```bash
# Old format (if applicable)
# FATZEBRA_API_URL=https://gateway.pmnts-sandbox.io
# FATZEBRA_KEY=your_key

# New format
FATZEBRA_USERNAME=your_username
FATZEBRA_TOKEN=your_token
NODE_ENV=development
```

### Step 3: Update Import Statements

**Before:**
```typescript
import { FatZebra } from 'old-package';
import { PaymentForm } from 'custom-components';
```

**After:**
```typescript
import { 
  createFatZebraClient, 
  PaymentForm, 
  usePayment,
  handleFatZebraResponse 
} from '@fwc/fat-zebra-nextjs';
```

### Step 4: Update Client Initialization

Replace your client initialization code:

```typescript
// Before
const client = new FatZebra(config);

// After
const client = createFatZebraClient({
  username: process.env.FATZEBRA_USERNAME!,
  token: process.env.FATZEBRA_TOKEN!,
  isTestMode: process.env.NODE_ENV !== 'production'
});
```

### Step 5: Update API Calls

Replace direct API calls with client methods:

```typescript
// Before
const purchase = await client.purchase(data);

// After
const response = await client.createPurchase(data);
const transaction = handleFatZebraResponse(response);
```

### Step 6: Update React Components

Replace custom components with provided ones or update to new API:

```typescript
// Before
<CustomPaymentForm onSuccess={handleSuccess} />

// After
const { processPayment } = usePayment();
<PaymentForm onSubmit={processPayment} />
```

### Step 7: Update Error Handling

```typescript
// Before
if (response.error) {
  console.error(response.error);
}

// After
try {
  const transaction = handleFatZebraResponse(response);
} catch (error) {
  if (error instanceof FatZebraError) {
    console.error('Payment failed:', error.message);
    console.error('Details:', error.errors);
  }
}
```

### Step 8: Test in Development

1. Start your development server
2. Test payment flows with test cards
3. Verify error handling works correctly
4. Check that tokenization works (if used)

## Code Examples

### Complete Migration Example

**Before (Custom Implementation):**
```typescript
// Old component
function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handlePayment = async (cardData) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Handle success
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Payment failed');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <CustomPaymentForm onSubmit={handlePayment} loading={loading} />
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

**After (New Library):**
```typescript
import { PaymentForm, usePayment } from '@fwc/fat-zebra-nextjs';

function CheckoutPage() {
  const { loading, error, success, processPayment } = usePayment();
  
  const handlePayment = async (paymentData) => {
    await processPayment({
      amount: 25.00,
      currency: 'AUD',
      reference: 'ORDER-' + Date.now(),
      cardDetails: paymentData.cardDetails
    });
  };

  if (success) {
    return <div className="success">Payment successful!</div>;
  }

  return (
    <div>
      <PaymentForm 
        onSubmit={handlePayment} 
        loading={loading}
        amount={25.00}
        currency="AUD"
      />
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

## Troubleshooting

### Common Migration Issues

#### 1. TypeScript Errors

**Error:** `Property 'createPurchase' does not exist on type...`

**Solution:** Ensure you're using the correct import:
```typescript
import { createFatZebraClient } from '@fwc/fat-zebra-nextjs';
// Not: import { FatZebraClient } from '@fwc/fat-zebra-nextjs';
```

#### 2. Environment Variable Issues

**Error:** `Cannot read property 'username' of undefined`

**Solution:** Check your environment variables:
```bash
# Verify these are set
echo $FATZEBRA_USERNAME
echo $FATZEBRA_TOKEN
```

#### 3. API Response Format Changes

**Error:** `Cannot read property 'id' of undefined`

**Solution:** Use the response handler:
```typescript
// Before
const transactionId = response.response.id;

// After
const transaction = handleFatZebraResponse(response);
const transactionId = transaction.id;
```

#### 4. Build Errors

**Error:** `Module not found: Can't resolve '@fwc/fat-zebra-nextjs/server'`

**Solution:** Check your import paths and ensure the library is properly installed:
```bash
npm install @fwc/fat-zebra-nextjs @fat-zebra/sdk
```

#### 5. React Hook Issues

**Error:** `usePayment is not a function`

**Solution:** Ensure correct import:
```typescript
import { usePayment } from '@fwc/fat-zebra-nextjs';
// Not from: '@fwc/fat-zebra-nextjs/hooks'
```

### Testing Migration

Create a simple test to verify your migration:

```typescript
// test-migration.js
import { createFatZebraClient, TEST_CARDS } from '@fwc/fat-zebra-nextjs';

async function testMigration() {
  const client = createFatZebraClient({
    username: process.env.FATZEBRA_USERNAME!,
    token: process.env.FATZEBRA_TOKEN!,
    isTestMode: true
  });

  try {
    const response = await client.createPurchase({
      amount: 1.00,
      currency: 'AUD',
      reference: 'MIGRATION-TEST-' + Date.now(),
      card_details: {
        card_holder: 'Test User',
        card_number: TEST_CARDS.VISA_SUCCESS,
        card_expiry: '12/25',
        cvv: '123'
      }
    });

    console.log('Migration test successful:', response.response.id);
  } catch (error) {
    console.error('Migration test failed:', error.message);
  }
}

testMigration();
```

### Performance Considerations

1. **Tree Shaking**: The new library supports tree shaking, import only what you need
2. **Bundle Size**: Check your bundle size after migration
3. **Caching**: Consider implementing response caching for repeated API calls

### Security Notes

1. **Environment Variables**: Never expose credentials in client-side code
2. **HTTPS**: Ensure all production traffic uses HTTPS
3. **Validation**: Always validate payment data on the server side
4. **PCI Compliance**: Review PCI DSS requirements for your implementation

## Post-Migration Checklist

- [ ] All payment flows work in development
- [ ] Error handling works correctly
- [ ] Tokenization works (if used)
- [ ] Tests pass
- [ ] Bundle size is acceptable
- [ ] Production environment variables are set
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Team trained on new API

## Need Help?

If you encounter issues during migration:

1. **Check the API documentation**: [api.md](./api.md)
2. **Review example implementations**: Check the `/examples` directory
3. **Search existing issues**: [GitHub Issues](https://github.com/rod-higgins/fat-zebra-nextjs/issues)
4. **Create a new issue**: Provide detailed information about your migration scenario

## Version Compatibility

| Old Version | New Version | Migration Path |
|-------------|-------------|----------------|
| Custom Implementation | v1.0.0+ | Follow this guide |
| @fat-zebra/sdk only | v1.0.0+ | Add React components and hooks |
| Legacy Fat Zebra | v1.0.0+ | Complete rewrite recommended |

Remember to test thoroughly in a staging environment before deploying to production!