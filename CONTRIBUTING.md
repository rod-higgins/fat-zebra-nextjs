# Contributing to Fat Zebra Next.js Library

Thank you for your interest in contributing to the Fat Zebra Next.js library! This document provides guidelines and information for contributors.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Process](#contributing-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Reporting Issues](#reporting-issues)
- [Security](#security)

## Getting Started

### Prerequisites

- Node.js 18+ and npm 8+
- Git
- TypeScript knowledge
- React/Next.js experience
- Understanding of payment processing concepts

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/rod-higgins/fat-zebra-nextjs.git
   cd fat-zebra-nextjs
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Add your Fat Zebra test credentials
   ```

4. **Run Tests**
   ```bash
   npm test
   npm run type-check
   npm run lint
   ```

5. **Build Package**
   ```bash
   npm run build
   ```

## Contributing Process

### 1. Create an Issue

Before starting work, create an issue describing:
- The problem you're solving
- Proposed solution approach
- Any breaking changes
- Testing strategy

### 2. Branch Naming

Use descriptive branch names:
- `feature/add-subscription-support`
- `fix/payment-form-validation`
- `docs/update-api-reference`
- `refactor/client-architecture`

### 3. Development Workflow

1. Create a feature branch from `develop`
2. Make your changes following our coding standards
3. Add comprehensive tests
4. Update documentation
5. Ensure all checks pass
6. Submit a pull request

### 4. Pull Request Process

- Fill out the PR template completely
- Link to related issues
- Add screenshots for UI changes
- Ensure CI passes
- Request review from maintainers

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer explicit types over `any`
- Use proper JSDoc comments for public APIs
- Follow existing naming conventions

```typescript
// Good
interface PaymentRequest {
  amount: number;
  currency: string;
  reference: string;
}

// Avoid
interface PaymentRequest {
  amount: any;
  currency: any;
  reference: any;
}
```

### React Components

- Use functional components with hooks
- Prefer named exports for components
- Include proper TypeScript prop types
- Handle loading and error states

```typescript
// Good
export const PaymentForm: React.FC<PaymentFormProps> = ({
  onSubmit,
  loading = false,
  ...props
}) => {
  // Component implementation
};

// Component prop types
export interface PaymentFormProps {
  onSubmit: (data: PaymentFormData) => Promise<void>;
  loading?: boolean;
}
```

### Error Handling

- Create custom error types for specific use cases
- Provide helpful error messages
- Include error codes when applicable
- Log errors appropriately

```typescript
export class FatZebraError extends Error {
  public errors: string[];
  public code?: string;

  constructor(message: string, errors: string[] = [], code?: string) {
    super(message);
    this.name = 'FatZebraError';
    this.errors = errors;
    this.code = code;
  }
}
```

### Code Organization

```
src/
├── components/          # React components
├── hooks/              # Custom React hooks
├── lib/                # Core library code
├── server/             # Server-side utilities
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

## Testing Guidelines

### Test Coverage

- Maintain >80% test coverage
- Test both happy path and error scenarios
- Include integration tests for critical flows
- Mock external dependencies appropriately

### Unit Tests

```typescript
describe('validateCard', () => {
  it('should validate correct card numbers', () => {
    const result = validateCard('4005550000000001');
    expect(result.isValid).toBe(true);
    expect(result.cardType).toBe('Visa');
  });

  it('should reject invalid card numbers', () => {
    const result = validateCard('invalid');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

### Component Tests

```typescript
describe('PaymentForm', () => {
  it('should submit form with valid data', async () => {
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
    render(<PaymentForm onSubmit={mockOnSubmit} />);
    
    // Fill out form and submit
    // Verify mockOnSubmit was called with correct data
  });
});
```

### Integration Tests

Test complete payment flows including API interactions.

## Documentation

### Code Documentation

- Document all public APIs with JSDoc
- Include usage examples
- Document any gotchas or limitations
- Keep README.md up to date

### API Documentation

```typescript
/**
 * Creates a new payment transaction
 * @param request - The payment request details
 * @returns Promise resolving to transaction response
 * @throws {FatZebraError} When payment fails
 * 
 * @example
 * ```typescript
 * const transaction = await client.createPurchase({
 *   amount: 10.00,
 *   currency: 'AUD',
 *   reference: 'ORDER-123',
 *   card_details: cardDetails
 * });
 * ```
 */
async createPurchase(request: PurchaseRequest): Promise<FatZebraResponse<TransactionResponse>> {
  // Implementation
}
```

### Examples

- Provide working examples for common use cases
- Include both TypeScript and JavaScript versions
- Test examples to ensure they work
- Show error handling

## Reporting Issues

### Bug Reports

Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node.js version, browser, etc.)
- Code samples demonstrating the issue

### Feature Requests

Include:
- Use case description
- Proposed API design
- Consider backward compatibility
- Implementation complexity assessment

### Issue Templates

Use the provided issue templates for consistency.

## Security

### Sensitive Information

- Never commit credentials or API keys
- Use environment variables for configuration
- Be mindful of logging sensitive data
- Follow OWASP security guidelines

### Reporting Security Issues

**Do not report security vulnerabilities through public GitHub issues.**

Instead, please report them to: security@example.com

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fixes (if any)

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Changelog

All notable changes are documented in `CHANGELOG.md` following the [Keep a Changelog](https://keepachangelog.com/) format.

### Release Checklist

- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md`
- [ ] Run full test suite
- [ ] Update documentation
- [ ] Create GitHub release
- [ ] Publish to npm

## Getting Help

- **Documentation**: Check the [API documentation](./docs/api.md)
- **Examples**: Look at the [examples directory](./examples/)
- **Issues**: Search existing [GitHub issues](https://github.com/rod-higgins/fat-zebra-nextjs/issues)
- **Discussions**: Start a [GitHub discussion](https://github.com/rod-higgins/fat-zebra-nextjs/discussions)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## License

By contributing to this project, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for contributing to the Fat Zebra Next.js library! 🎉