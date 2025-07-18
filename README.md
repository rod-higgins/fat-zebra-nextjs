# Fat Zebra Next.js Library

A comprehensive TypeScript library for integrating Fat Zebra payment gateway with Next.js 14+ applications. Built on top of the official `@fat-zebra/sdk` with additional features for complete payment workflows.

## Features

- Built on official `@fat-zebra/sdk`
- Complete payment processing (purchases, authorizations, captures, refunds)
- Secure card tokenization with 3DS2 support
- React components and hooks
- Built-in validation and error handling
- Test mode support
- Pre-built responsive payment forms
- Server-side API route helpers

## Installation

```bash
npm install @your-org/fat-zebra-nextjs @fat-zebra/sdk
# or
yarn add @your-org/fat-zebra-nextjs @fat-zebra/sdk
```

## Quick Start

```tsx
import { PaymentForm, usePayment } from '@your-org/fat-zebra-nextjs';

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
        amount={10.00}
      />
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

## Documentation

- [API Reference](./docs/api.md)
- [Examples](./examples/)
- [Migration Guide](./docs/migration.md)

## License

MIT
