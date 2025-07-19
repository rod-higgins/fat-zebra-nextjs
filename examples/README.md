# Fat Zebra Next.js Library Examples

This directory contains practical examples demonstrating how to use the Fat Zebra Next.js library in various scenarios.

## Examples Overview

### 1. Basic Checkout (`basic-checkout/`)
A simple checkout page with payment form and basic payment processing.

**Features:**
- Simple payment form
- Basic error handling
- Success/failure states
- Customer information collection

**Use Case:** Simple e-commerce checkout, one-time payments

### 2. With Tokenization (`with-tokenization/`)
Advanced payment processing with OAuth authentication, 3DS2, and card tokenization.

**Features:**
- OAuth token generation
- 3D Secure 2.0 authentication
- Card tokenization for future use
- Enhanced security

**Use Case:** Subscription services, repeat customers, stored payment methods

### 3. Server-Side Only (`server-side-only/`)
Server-side API routes for payment processing without client-side components.

**Features:**
- Pure server-side implementation
- API endpoints for payment and refunds
- Comprehensive error handling
- Input validation

**Use Case:** Headless commerce, mobile apps, custom integrations

### 4. Webhook Handler (`webhook-handler/`)
Webhook endpoint for handling Fat Zebra event notifications.

**Features:**
- Webhook signature verification
- Event type handling
- Database updates
- Notification processing

**Use Case:** Order status updates, automated refunds, settlement tracking

### 5. Subscription Billing (`subscription-billing/`)
Recurring payment setup with tokenization and subscription management.

**Features:**
- Subscription creation
- Token-based recurring payments
- Billing cycle management
- Initial payment processing

**Use Case:** SaaS applications, membership sites, recurring services

## Running the Examples

### Prerequisites

1. Fat Zebra sandbox account
2. Environment variables configured
3. Next.js 14+ application

### Setup

1. Copy any example to your Next.js project
2. Install the library: `npm install @fwc/fat-zebra-nextjs @fat-zebra/sdk`
3. Configure environment variables:

```bash
# .env.local
FATZEBRA_USERNAME=your_username
FATZEBRA_TOKEN=your_token
FATZEBRA_SHARED_SECRET=your_shared_secret
FATZEBRA_CLIENT_ID=your_client_id
FATZEBRA_CLIENT_SECRET=your_client_secret
NODE_ENV=development
```

### Test Cards

Use these test card numbers for development:

```typescript
// Successful transactions
'4005550000000001' // Visa
'5123456789012346' // MasterCard
'345678901234564'  // American Express

// Declined transactions
'4005550000000019' // Visa Decline
'5123456789012353' // MasterCard Decline
```

## Integration Patterns

### Client-Side Integration

```tsx
import { PaymentForm, usePayment } from '@fwc/fat-zebra-nextjs';

function CheckoutPage() {
  const { processPayment, loading, error, success } = usePayment();
  
  return (
    <PaymentForm 
      onSubmit={processPayment}
      amount={25.00}
      currency="AUD"
      loading={loading}
    />
  );
}
```

### Server-Side Integration

```typescript
import { createFatZebraClient, handleFatZebraResponse } from '@fwc/fat-zebra-nextjs/server';

const client = createFatZebraClient({
  username: process.env.FATZEBRA_USERNAME!,
  token: process.env.FATZEBRA_TOKEN!,
  isTestMode: true
});

const response = await client.createPurchase(purchaseData);
const transaction = handleFatZebraResponse(response);
```

### OAuth + 3DS2 Integration

```tsx
import { useOAuthPayment } from '@fwc/fat-zebra-nextjs';

function SecureCheckout() {
  const payment = useOAuthPayment(accessToken, username, {
    enableTokenization: true,
    enable3DS: true
  });
  
  return (
    <PaymentForm 
      {...payment}
      enableTokenization={true}
      enable3DS={true}
      accessToken={accessToken}
      username={username}
    />
  );
}
```

## Best Practices

### Security
- Always validate amounts server-side
- Use HTTPS in production
- Store sensitive credentials as environment variables
- Implement proper error handling
- Use tokenization for stored payment methods

### Error Handling
- Provide clear error messages to users
- Log detailed errors server-side
- Implement retry logic for network failures
- Handle different error types appropriately

### Testing
- Use sandbox mode for development
- Test with various card types
- Test error scenarios
- Verify webhook signature validation

### Performance
- Implement loading states
- Use proper caching for OAuth tokens
- Optimize bundle size with tree shaking
- Consider server-side rendering for better UX

## Support

- [Library Documentation](../docs/api.md)
- [Migration Guide](../docs/migration.md)
- [Fat Zebra API Documentation](https://docs.fatzebra.com)
- [GitHub Issues](https://github.com/your-org/fat-zebra-nextjs/issues)