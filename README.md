# Fat Zebra Next.js Library v0.5.6

A comprehensive TypeScript library for integrating Fat Zebra payment gateway with Next.js 14+ applications. Built on top of the official `@fat-zebra/sdk` v1.5.9 with OAuth authentication, 3DS2 support, and modern security features.

## What's New in v0.5.6

- **First NPM Release**: This is the first version to be published to NPM
- **Production Ready Build**: All tests passing, complete CI/CD pipeline
- **OAuth Authentication**: Full support for OAuth token-based authentication
- **3DS2 Integration**: Complete 3D Secure 2.0 authentication support
- **Modern SDK Integration**: Built on latest `@fat-zebra/sdk` v1.5.9
- **Enhanced Security**: Server-side verification hash generation
- **Improved Error Handling**: Comprehensive error types and handling
- **TypeScript First**: Full TypeScript support with strict types
- **React 18+ Compatible**: Optimized for React 18 and Next.js 14+

## Installation

```bash
npm install @fwcgovau/fat-zebra-nextjs @fat-zebra/sdk
# or
yarn add @fwcgovau/fat-zebra-nextjs @fat-zebra/sdk
```

## Environment Setup

Create a `.env.local` file in your project root:

```bash
# Fat Zebra API Credentials
FATZEBRA_USERNAME=your_username
FATZEBRA_TOKEN=your_token
FATZEBRA_SHARED_SECRET=your_shared_secret

# OAuth Credentials (for client-side SDK)
FATZEBRA_CLIENT_ID=your_client_id
FATZEBRA_CLIENT_SECRET=your_client_secret

# Environment
NODE_ENV=development  # Use 'production' for live mode
```

## Quick Start

### Basic Payment Form

```tsx
import { PaymentForm, usePayment } from '@fwcgovau/fat-zebra-nextjs';

function CheckoutPage() {
  const { loading, error, success, processPayment } = usePayment();

  const handlePayment = async (paymentData) => {
    await processPayment(paymentData);
  };

  if (success) {
    return <div>Payment successful!</div>;
  }

  return (
    <div>
      <PaymentForm 
        onSubmit={handlePayment}
        loading={loading}
        error={error}
      />
    </div>
  );
}
```

### Advanced Usage with OAuth and 3DS2

```tsx
import { useOAuthPayment } from '@fwcgovau/fat-zebra-nextjs';

function AdvancedCheckout() {
  const { 
    processPayment, 
    handle3DS2Challenge, 
    loading, 
    error, 
    threeDSResult 
  } = useOAuthPayment({
    clientId: process.env.NEXT_PUBLIC_FATZEBRA_CLIENT_ID,
    environment: 'sandbox'
  });

  const handlePayment = async (paymentData) => {
    const result = await processPayment({
      ...paymentData,
      threeds: {
        browser_info: {
          accept_header: "text/html",
          color_depth: 24,
          java_enabled: false,
          language: "en-US",
          screen_height: 1080,
          screen_width: 1920,
          timezone: -300,
          user_agent: navigator.userAgent
        }
      }
    });

    if (result.threeds_required) {
      await handle3DS2Challenge(result);
    }
  };

  return (
    <PaymentForm onSubmit={handlePayment} />
  );
}
```

## Server-side API Routes

### Required API Routes

Create these API routes in your Next.js application:

```typescript
// pages/api/payment/tokenize.ts
import { createFatZebraClient } from '@fwcgovau/fat-zebra-nextjs/server';

export default async function handler(req, res) {
  const client = createFatZebraClient({
    username: process.env.FATZEBRA_USERNAME,
    token: process.env.FATZEBRA_TOKEN,
    environment: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox'
  });

  try {
    const result = await client.tokenize(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
```

```typescript
// pages/api/payment/purchase.ts
import { createFatZebraClient } from '@fwcgovau/fat-zebra-nextjs/server';

export default async function handler(req, res) {
  const client = createFatZebraClient({
    username: process.env.FATZEBRA_USERNAME,
    token: process.env.FATZEBRA_TOKEN,
    sharedSecret: process.env.FATZEBRA_SHARED_SECRET,
    environment: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox'
  });

  try {
    const result = await client.purchase(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
```

### Custom Server-side Usage

```typescript
import { createFatZebraClient } from '@fwcgovau/fat-zebra-nextjs/server';

const client = createFatZebraClient({
  username: process.env.FATZEBRA_USERNAME,
  token: process.env.FATZEBRA_TOKEN,
  sharedSecret: process.env.FATZEBRA_SHARED_SECRET,
  environment: 'sandbox'
});

// Process a payment
const payment = await client.purchase({
  amount: 1000, // $10.00 in cents
  currency: 'AUD',
  card_token: 'token_123',
  reference: 'ORDER-123'
});

// Create a subscription
const subscription = await client.createSubscription({
  customer_id: 'customer_123',
  plan_id: 'plan_456',
  card_token: 'token_789'
});
```

## Security Features

### OAuth Authentication
- Client-side token management
- Automatic token refresh
- Secure credential storage

### 3D Secure 2.0
- Full 3DS2 authentication flow
- Browser fingerprinting
- Challenge handling

### Verification Hashes
- Server-side hash generation
- Request integrity verification
- Tamper detection

### PCI Compliance
- Tokenization for card data
- No sensitive data storage
- Secure transmission

## API Reference

### Components

#### PaymentForm

```tsx
<PaymentForm
  onSubmit={(data) => handlePayment(data)}
  loading={false}
  error={null}
  className="payment-form"
  showCardholderName={true}
  validateOnBlur={true}
  autoComplete={true}
/>
```

### Hooks

#### usePayment()

```typescript
const {
  processPayment,
  loading,
  error,
  success,
  reset
} = usePayment();
```

#### useOAuthPayment()

```typescript
const {
  processPayment,
  handle3DS2Challenge,
  loading,
  error,
  threeDSResult,
  isAuthenticated
} = useOAuthPayment({ clientId, environment });
```

#### usePaymentEvents()

```typescript
const {
  events,
  subscribe,
  unsubscribe
} = usePaymentEvents();
```

### Server Functions

#### createFatZebraClient()

```typescript
const client = createFatZebraClient({
  username: string,
  token: string,
  sharedSecret?: string,
  environment: 'sandbox' | 'live'
});
```

#### Client Methods

```typescript
// Tokenization
await client.tokenize(cardData);

// Payments
await client.purchase(paymentData);
await client.refund(refundData);

// Subscriptions
await client.createSubscription(subscriptionData);
await client.updateSubscription(subscriptionId, updates);

// Settlements
await client.getSettlements(options);
```

## Testing

### Test Cards

```javascript
// Visa
4005550000000001 (Success)
4000000000000002 (Declined)

// Mastercard  
5123456789012346 (Success)
5555555555554444 (Declined)

// 3DS2 Test Cards
4000000000001091 (3DS2 Challenge)
4000000000001109 (3DS2 Frictionless)
```

### Test Environment

Set your environment variables for testing:

```bash
NODE_ENV=development
FATZEBRA_USERNAME=your_test_username
FATZEBRA_TOKEN=your_test_token
```

## Migration from v1.x

### Breaking Changes

1. **New SDK Base**: Now built on `@fat-zebra/sdk` v1.5.9
2. **OAuth Required**: Client-side operations now require OAuth setup
3. **API Changes**: Some method signatures have changed
4. **TypeScript**: Full TypeScript rewrite with strict types

### Migration Steps

1. **Update Dependencies**: 
   ```bash
   npm install @fwcgovau/fat-zebra-nextjs@0.5.6 @fat-zebra/sdk
   ```

2. **Update Environment Variables**: Add OAuth credentials

3. **Update API Routes**: Add the required API routes (see Server-side API Routes section)

4. **Update Component Usage**: Add OAuth and 3DS2 parameters to your components

## Documentation

- [API Reference](./docs/api.md)
- [Migration Guide](./docs/migration.md)
- [Examples](./examples/)
- [Fat Zebra API Docs](https://docs.fatzebra.com)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run `npm run validate`
6. Submit a pull request

## License

MIT © [Your Organization](LICENSE)

## Support

- **GitHub Issues**: [Report issues](https://github.com/your-org/fat-zebra-nextjs/issues)
- **Documentation**: [API Documentation](https://docs.fatzebra.com)
- **Fat Zebra Support**: [Contact Fat Zebra](https://www.fatzebra.com/support)

## Changelog

### v0.5.6 (Latest - First NPM Release)
- **🎉 First NPM Publication**: Package now available on npm registry
- Production-ready build system with complete CI/CD
- All tests passing with comprehensive coverage
- OAuth authentication support
- 3DS2 integration with official SDK
- Enhanced security with verification hashes
- TypeScript improvements with strict mode
- React 18 and Next.js 14 support
- Comprehensive error handling
- Updated test suite with >80% coverage

### v0.5.x (Pre-release)
- Development versions with incremental improvements
- Build system optimization
- Type definition enhancements

### Previous Versions
- Basic payment processing
- Simple tokenization
- Legacy API integration