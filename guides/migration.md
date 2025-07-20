# Migration Guide

This guide helps you migrate between versions of `@fwcgovau/fat-zebra-nextjs`.

## Table of Contents

- [v0.5.x → v0.5.6](#v05x--v056)
- [Pre-release → v0.5.6](#pre-release--v056)
- [Legacy/Custom Implementation → v0.5.6](#legacycustom-implementation--v056)
- [Breaking Changes Summary](#breaking-changes-summary)
- [Migration Checklist](#migration-checklist)

## v0.5.x → v0.5.6

### Overview

Version 0.5.6 is the first official NPM release. If you were using a pre-release version (0.5.0-0.5.5), this migration should be straightforward with no breaking changes.

### Installation

```bash
# Remove any pre-release version
npm uninstall your-previous-package

# Install the official NPM package
npm install @fwcgovau/fat-zebra-nextjs @fat-zebra/sdk
```

### No Code Changes Required

No code changes are required when migrating from v0.5.5 to v0.5.6. This is purely a build and packaging improvement release.

### What's New in v0.5.6

- **First NPM Release**: Now available on npm registry
- **Enhanced CI/CD**: Complete automated testing and publishing
- **Improved Validation**: Better package validation and integrity checks
- **Production Ready**: All tests passing, comprehensive coverage

## Pre-release → v0.5.6

### If You Used a Development Build

If you were using a development or git-based installation:

```bash
# Remove development installation
npm uninstall fat-zebra-nextjs

# Install official release
npm install @fwcgovau/fat-zebra-nextjs @fat-zebra/sdk
```

### Update Import Statements

No import changes needed - all imports remain the same:

```typescript
// These imports work exactly the same
import { PaymentForm, usePayment } from '@fwcgovau/fat-zebra-nextjs';
import { createFatZebraClient } from '@fwcgovau/fat-zebra-nextjs/server';
```

## Legacy/Custom Implementation → v0.5.6

### From Custom Fat Zebra Integration

If you're migrating from a custom Fat Zebra implementation to this library:

#### 1. Install Dependencies

```bash
npm install @fwcgovau/fat-zebra-nextjs @fat-zebra/sdk
```

#### 2. Environment Variables

Update your environment variables:

```bash
# OLD - Direct API integration
FATZEBRA_API_URL=https://gateway.sandbox.fatzebra.com.au
FATZEBRA_USERNAME=your_username
FATZEBRA_TOKEN=your_token

# NEW - Enhanced with OAuth support
FATZEBRA_USERNAME=your_username
FATZEBRA_TOKEN=your_token
FATZEBRA_SHARED_SECRET=your_shared_secret
FATZEBRA_CLIENT_ID=your_client_id
FATZEBRA_CLIENT_SECRET=your_client_secret
NODE_ENV=development
```

#### 3. Replace Custom Payment Forms

**Before:**
```typescript
// Custom implementation
const handlePayment = async (cardData) => {
  const response = await fetch('/api/fat-zebra/purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cardData)
  });
  return response.json();
};

// Custom form component
<form onSubmit={handlePayment}>
  <input name="card_number" />
  <input name="expiry" />
  <input name="cvv" />
  <button type="submit">Pay</button>
</form>
```

**After:**
```typescript
// Using the library
import { PaymentForm, usePayment } from '@fwcgovau/fat-zebra-nextjs';

const { processPayment, loading, error } = usePayment();

<PaymentForm 
  onSubmit={processPayment}
  loading={loading}
  error={error}
/>
```

#### 4. Replace Server-side Logic

**Before:**
```typescript
// Custom API route
import { FatZebra } from 'custom-fat-zebra-client';

export default async function handler(req, res) {
  const fz = new FatZebra(username, token);
  const result = await fz.purchase(req.body);
  res.json(result);
}
```

**After:**
```typescript
// Using the library
import { createFatZebraClient } from '@fwcgovau/fat-zebra-nextjs/server';

export default async function handler(req, res) {
  const client = createFatZebraClient({
    username: process.env.FATZEBRA_USERNAME,
    token: process.env.FATZEBRA_TOKEN,
    environment: 'sandbox'
  });
  
  const result = await client.purchase(req.body);
  res.json(result);
}
```

### From Other Payment Libraries

#### From Stripe

Key differences when migrating from Stripe:

1. **Amount Handling**: Fat Zebra uses cents (like Stripe)
2. **Card Tokenization**: Fat Zebra requires server-side tokenization
3. **3DS2**: Fat Zebra has built-in 3DS2 support
4. **Webhooks**: Different webhook signature verification

```typescript
// Stripe pattern
const { error } = await stripe.confirmCardPayment(clientSecret);

// Fat Zebra pattern
const result = await processPayment({
  amount: 1000,
  currency: 'AUD',
  card_number: '4005550000000001',
  card_expiry: '12/25',
  cvv: '123'
});
```

#### From PayPal

Key differences when migrating from PayPal:

1. **Direct Card Processing**: Fat Zebra processes cards directly
2. **No Redirect Flow**: Payments happen on your site
3. **Immediate Settlement**: Faster fund settlement

## Breaking Changes Summary

### v0.5.6 (Current)

**No breaking changes** - First official release

### Future Versions

When breaking changes are introduced, they will be documented here with:

- Clear description of what changed
- Migration path with code examples
- Timeline for deprecation
- Automated migration tools (when available)

## Migration Checklist

### General Migration

- [ ] Update package installation
- [ ] Update environment variables
- [ ] Test payment flow in sandbox
- [ ] Update error handling
- [ ] Run comprehensive tests
- [ ] Update documentation

### OAuth Migration (if applicable)

- [ ] Obtain OAuth credentials from Fat Zebra
- [ ] Update environment configuration
- [ ] Test OAuth token generation
- [ ] Update client-side authentication

### 3DS2 Migration (if applicable)

- [ ] Configure 3DS2 browser info
- [ ] Test challenge flow
- [ ] Update payment completion handling
- [ ] Test frictionless authentication

### TypeScript Migration

- [ ] Update type imports
- [ ] Fix any type errors
- [ ] Update interface definitions
- [ ] Test TypeScript compilation

## Testing Your Migration

### 1. Sandbox Testing

```typescript
// Test with sandbox credentials
const testPayment = {
  amount: 100, // $1.00
  currency: 'AUD',
  card_number: '4005550000000001', // Test card
  card_expiry: '12/25',
  cvv: '123',
  reference: 'TEST-MIGRATION'
};
```

### 2. Error Handling

```typescript
try {
  const result = await processPayment(testPayment);
  console.log('Migration successful:', result);
} catch (error) {
  console.error('Migration issue:', error);
}
```

### 3. Integration Tests

Run your full test suite to ensure:
- Payment processing works
- Error handling functions correctly
- 3DS2 flows complete successfully
- Webhooks process correctly

## Common Migration Issues

### 1. Environment Variables

**Issue**: `FATZEBRA_CLIENT_ID` not defined
**Solution**: Add OAuth credentials to your environment

### 2. Import Errors

**Issue**: `Module not found: @fwcgovau/fat-zebra-nextjs`
**Solution**: Ensure you've installed from npm, not a git repository

### 3. Type Errors

**Issue**: TypeScript compilation errors
**Solution**: Update your TypeScript imports and interfaces

### 4. API Route Errors

**Issue**: API routes not working
**Solution**: Ensure you've added the required Next.js API routes

## Getting Help

If you encounter issues during migration:

1. **Check the [API Documentation](./api.md)**
2. **Review [Examples](../examples/)**
3. **Search [GitHub Issues](https://github.com/rod-higgins/fat-zebra-nextjs/issues)**
4. **Create a new issue** with:
   - Your migration source (e.g., "migrating from v0.5.3")
   - Error messages
   - Code examples
   - Environment details

## Support

- **GitHub Issues**: [Report migration issues](https://github.com/rod-higgins/fat-zebra-nextjs/issues)
- **Fat Zebra Support**: [Technical support](https://www.fatzebra.com/support)
- **Documentation**: [Complete API reference](./api.md)

---

**Migration successful?** Help others by contributing to this guide with your experience!