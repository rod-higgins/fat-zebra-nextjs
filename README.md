# Fat Zebra Next.js Integration

[![npm version](https://img.shields.io/npm/v/@fwcgovau/fat-zebra-nextjs.svg)](https://www.npmjs.com/package/@fwcgovau/fat-zebra-nextjs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)

A comprehensive TypeScript library for integrating Fat Zebra payment gateway with Next.js 14+ applications. Built on top of the official `@fat-zebra/sdk` v1.5.9 with OAuth authentication, 3DS2 support, and modern security features.

## Features

- **OAuth Authentication**: Full support for OAuth token-based authentication
- **3DS2 Integration**: Complete 3D Secure 2.0 authentication support  
- **Modern SDK Integration**: Built on latest `@fat-zebra/sdk` v1.5.9
- **Enhanced Security**: Server-side verification hash generation
- **Improved Error Handling**: Comprehensive error types and handling
- **TypeScript First**: Full TypeScript support with strict types
- **React 18+ Compatible**: Optimized for React 18 and Next.js 14+

## Quick Start

### Installation

```bash
npm install @fwcgovau/fat-zebra-nextjs @fat-zebra/sdk
# or
yarn add @fwcgovau/fat-zebra-nextjs @fat-zebra/sdk
```

### Environment Configuration

Create a `.env.local` file in your project root:

```env
# Fat Zebra API Credentials
FATZEBRA_USERNAME=your_username
FATZEBRA_TOKEN=your_token
FATZEBRA_SHARED_SECRET=your_shared_secret

# OAuth Credentials (for client-side SDK)
FATZEBRA_CLIENT_ID=your_client_id
FATZEBRA_CLIENT_SECRET=your_client_secret

# Environment
NODE_ENV=development # Use 'production' for live mode
```

### Basic Usage

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
        currency="AUD"
        amount={25.00}
        enableTokenization={true}
        enable3DS={true}
      />
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

### OAuth Authentication Example

```tsx
import { PaymentForm, useOAuthPayment } from '@fwcgovau/fat-zebra-nextjs';
import { useEffect, useState } from 'react';

function SecureCheckoutPage() {
  const [accessToken, setAccessToken] = useState<string>('');
  const { loading, error, success, processPayment } = useOAuthPayment(
    accessToken,
    'your-username',
    { enableTokenization: true, enable3DS: true }
  );

  useEffect(() => {
    // Generate OAuth token on component mount
    fetch('/api/auth/token', { method: 'POST' })
      .then(res => res.json())
      .then(data => setAccessToken(data.accessToken));
  }, []);

  const handlePayment = async (paymentData) => {
    await processPayment(paymentData);
  };

  const handleTokenizationSuccess = (token: string) => {
    console.log('Card tokenized successfully:', token);
  };

  const handleScaSuccess = (event: any) => {
    console.log('3DS authentication successful:', event);
  };

  if (success) {
    return <div>Payment successful with 3DS authentication!</div>;
  }

  return (
    <div>
      <PaymentForm
        onSubmit={handlePayment}
        loading={loading}
        currency="AUD"
        amount={100.00}
        enableTokenization={true}
        enable3DS={true}
        accessToken={accessToken}
        username="your-username"
        onTokenizationSuccess={handleTokenizationSuccess}
        onScaSuccess={handleScaSuccess}
      />
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

## Next.js API Routes

Create these API routes in your Next.js application:

```typescript
// app/api/auth/token/route.ts
import { generateAccessToken } from '@fwcgovau/fat-zebra-nextjs/server';
export { generateAccessToken as POST };

// app/api/generate-verification-hash/route.ts
import { generateVerificationHash } from '@fwcgovau/fat-zebra-nextjs/server';
export { generateVerificationHash as POST };

// app/api/payments/route.ts
import { processPayment } from '@fwcgovau/fat-zebra-nextjs/server';
export { processPayment as POST };

// app/api/payments/with-token/route.ts
import { processPaymentWithToken } from '@fwcgovau/fat-zebra-nextjs/server';
export { processPaymentWithToken as POST };

// app/api/webhooks/fatzebra/route.ts
import { handleWebhook } from '@fwcgovau/fat-zebra-nextjs/server';
export { handleWebhook as POST };
```

## Server-side Usage

```typescript
import { createFatZebraClient, handleFatZebraResponse } from '@fwcgovau/fat-zebra-nextjs/server';

const client = createFatZebraClient({
  username: process.env.FATZEBRA_USERNAME!,
  token: process.env.FATZEBRA_TOKEN!,
  isTestMode: process.env.NODE_ENV !== 'production',
  sharedSecret: process.env.FATZEBRA_SHARED_SECRET!
});

// Process a payment
const response = await client.createPurchase({
  amount: 25.00,
  currency: 'AUD',
  reference: 'ORDER-123',
  card_details: {
    card_holder: 'John Doe',
    card_number: '4005550000000001',
    card_expiry: '12/25',
    cvv: '123'
  }
});

const transaction = handleFatZebraResponse(response);
```

## API Reference

### Components

#### PaymentForm

Complete payment form with built-in validation and 3DS2 support.

**Props:**
- `onSubmit: (data: PaymentFormData) => Promise<void>` - Payment submission handler
- `amount?: number` - Payment amount (optional if user enters)
- `currency?: string` - Currency code (default: 'AUD')
- `loading?: boolean` - Show loading state
- `enableTokenization?: boolean` - Enable secure tokenization
- `enable3DS?: boolean` - Enable 3D Secure authentication
- `accessToken?: string` - OAuth access token for SDK
- `username?: string` - Fat Zebra username for SDK
- `onTokenizationSuccess?: (token: string) => void` - Tokenization callback
- `onScaSuccess?: (event: any) => void` - 3DS success callback

### Hooks

#### usePayment()

Basic payment processing hook.

```typescript
const { loading, error, success, processPayment, tokenizeCard, verifyCard, reset } = usePayment(options);
```

#### useOAuthPayment()

Enhanced payment hook with OAuth authentication.

```typescript
const result = useOAuthPayment(accessToken, username, options);
```

#### usePaymentEvents()

Hook for handling SDK events.

```typescript
const { events, lastEvent, createHandlers, clearEvents } = usePaymentEvents();
```

### Server Functions

#### createFatZebraClient()

Create a Fat Zebra client instance.

```typescript
const client = createFatZebraClient({
  username: 'your-username',
  token: 'your-token',
  isTestMode: true,
  sharedSecret: 'your-shared-secret'
});
```

**Available Methods:**
- `generateAccessToken(oauthConfig)` - Generate OAuth access token
- `createPurchase(request)` - Process a payment
- `createPurchaseWithToken(token, amount, reference)` - Process payment with token
- `createAuthorization(request)` - Create authorization (pre-auth)
- `captureAuthorization(authId, amount?)` - Capture authorization
- `createRefund(request)` - Process refund
- `createToken(request)` - Tokenize card details
- `generateVerificationHash(data)` - Generate verification hash
- `verifyWebhookSignature(payload, signature)` - Verify webhook

## Testing

Use the provided test card numbers:

```typescript
import { TEST_CARDS } from '@fwcgovau/fat-zebra-nextjs';

// Successful cards
TEST_CARDS.VISA_SUCCESS         // '4005550000000001'
TEST_CARDS.VISA_3DS_SUCCESS     // '4005554444444460'
TEST_CARDS.MASTERCARD_SUCCESS   // '5123456789012346'

// Decline cards
TEST_CARDS.VISA_DECLINE         // '4005550000000019'
TEST_CARDS.MASTERCARD_DECLINE   // '5123456789012353'
```

The library automatically detects test mode based on `NODE_ENV`. In development, all transactions are processed in sandbox mode.

## Migration from v1.x

### Breaking Changes

- **OAuth Required**: Client-side SDK now requires OAuth authentication
- **New API Structure**: Updated to match `@fat-zebra/sdk` v1.5.9
- **3DS2 Integration**: New 3D Secure authentication flow
- **Verification Hashes**: Now required for all tokenization operations

### Migration Steps

1. **Update Dependencies:**
   ```bash
   npm install @fwcgovau/fat-zebra-nextjs@^0.5.8 @fat-zebra/sdk@^1.5.9
   ```

2. **Add New Environment Variables:**
   ```env
   FATZEBRA_SHARED_SECRET=your_shared_secret
   FATZEBRA_CLIENT_ID=your_client_id
   FATZEBRA_CLIENT_SECRET=your_client_secret
   ```

3. **Update API Routes**: Add the required API routes (see Server-side API Routes section)

4. **Update Component Usage**: Add OAuth and 3DS2 parameters to your components

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run `npm run validate`
6. Submit a pull request

## License

MIT © [Rod Higgins](https://github.com/rod-higgins/fat-zebra-nextjs/blob/main/LICENSE)

## Support

- **GitHub Issues**: [Report issues](https://github.com/rod-higgins/fat-zebra-nextjs/issues)
- **Documentation**: [API Documentation](https://docs.fatzebra.com)
- **Fat Zebra Support**: [Contact Fat Zebra](https://www.fatzebra.com/support)

## Changelog

### v0.5.9 (Latest)

- Added missing useOAuthPayment hook with tests

### v0.5.8

- Documentation updates

### v0.5.7

- **First NPM Publication**: Package now available on npm registry
- Complete CI/CD pipeline with automated testing and publishing
- Production-ready build artifacts with ES modules and CommonJS support
- Comprehensive package validation and security checks

### v0.5.6

- All tests passing with comprehensive coverage >80%
- Enhanced build system with proper artifact generation
- Improved TypeScript type definitions

### v0.2.0

- OAuth authentication support
- 3DS2 integration with official SDK
- Enhanced security with verification hashes
- TypeScript improvements
- React 18 and Next.js 14 support
- Comprehensive error handling
- Updated test suite

### v1.x (Legacy)

- Basic payment processing
- Simple tokenization  
- Legacy API integration