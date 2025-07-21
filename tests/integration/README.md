# Fat Zebra Integration Tests

This directory contains integration tests that make real API calls to Fat Zebra's sandbox environment.

## Setup

1. Copy `.env.test.example` to `.env.test`
2. Fill in your Fat Zebra sandbox credentials
3. Run tests: `npm run test:integration`

## Test Structure

- `payments.integration.test.ts` - Core payment processing tests
- `security.integration.test.ts` - Security and compliance tests  
- `forms.integration.test.ts` - Form validation and submission tests
- `oauth.integration.test.ts` - OAuth authentication tests
- `helpers/` - Test helper functions and data

## Environment Variables Required

- `FATZEBRA_TEST_USERNAME` - Your sandbox username
- `FATZEBRA_TEST_TOKEN` - Your sandbox token
- `FATZEBRA_TEST_SHARED_SECRET` - Your shared secret (optional)

## Running Tests

```bash
# Run only integration tests
npm run test:integration

# Run only unit tests (for coverage)
npm run test:unit

# Run all tests
npm run test:all
```
