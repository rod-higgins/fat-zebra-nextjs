# Contributing to Fat Zebra Next.js Integration

Welcome! We're excited that you're interested in contributing to the Fat Zebra Next.js integration library. This guide will help you get started.

## Quick Start

1. **Fork the Repository**
   ```bash
   git clone https://github.com/rod-higgins/fat-zebra-nextjs.git
   cd fat-zebra-nextjs
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment**
   ```bash
   cp .env.example .env.local
   # Add your Fat Zebra test credentials
   ```

4. **Run Tests**
   ```bash
   npm run test
   ```

5. **Start Development**
   ```bash
   npm run dev
   ```

## Development Workflow

### Before Making Changes

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Ensure Tests Pass**
   ```bash
   npm run validate
   ```

### Development Commands

- `npm run build` - Build the library
- `npm run test` - Run test suite
- `npm run testwatch` - Run tests in watch mode
- `npm run testcoverage` - Generate coverage report
- `npm run lint` - Check code style
- `npm run lintfix` - Fix code style issues
- `npm run typecheck` - Check TypeScript types
- `npm run docs` - Generate documentation

### Making Changes

1. **Write Tests First**: Add tests for new functionality
2. **Follow TypeScript Standards**: Ensure type safety
3. **Update Documentation**: Update relevant docs and examples
4. **Run Validation**: `npm run validate` before committing

## Testing Guidelines

### Test Structure

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete payment flows

### Test Commands

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run testwatch

# Generate coverage report
npm run testcoverage

# Run specific test file
npm run test -- PaymentForm.test.tsx
```

### Writing Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentForm } from '../PaymentForm';

describe('PaymentForm', () => {
  it('should render payment form', () => {
    render(<PaymentForm onSubmit={jest.fn()} />);
    expect(screen.getByText('Card Number')).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    const onSubmit = jest.fn();
    render(<PaymentForm onSubmit={onSubmit} />);
    
    // Test form interaction
    fireEvent.click(screen.getByText('Pay Now'));
    
    expect(onSubmit).toHaveBeenCalled();
  });
});
```

## Code Style

### TypeScript Guidelines

- Use strict TypeScript configuration
- Prefer `interface` over `type` for object shapes
- Use descriptive names for types and interfaces
- Add JSDoc comments for public APIs

```typescript
/**
 * Configuration options for payment processing
 */
interface PaymentConfig {
  /** Enable 3D Secure authentication */
  enable3DS?: boolean;
  /** Enable card tokenization */
  enableTokenization?: boolean;
  /** Currency code (default: AUD) */
  currency?: string;
}
```

### Component Guidelines

- Use functional components with hooks
- Extract reusable logic into custom hooks
- Follow React best practices
- Add proper error boundaries

```tsx
import { useState, useCallback } from 'react';

interface PaymentFormProps {
  onSubmit: (data: PaymentData) => Promise<void>;
  loading?: boolean;
}

export function PaymentForm({ onSubmit, loading = false }: PaymentFormProps) {
  const [formData, setFormData] = useState<PaymentData>({});

  const handleSubmit = useCallback(async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit(formData);
  }, [formData, onSubmit]);

  return (
    <form onSubmit={handleSubmit}>
      {/* Form content */}
    </form>
  );
}
```

### Naming Conventions

- **Files**: PascalCase for components, camelCase for utilities
- **Components**: PascalCase
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types**: PascalCase with descriptive names

## Bug Reports

### Before Reporting

1. **Search Existing Issues**: Check if the bug is already reported
2. **Test in Latest Version**: Ensure you're using the latest release
3. **Minimal Reproduction**: Create a minimal example that reproduces the issue

### Bug Report Template

When reporting a bug, include:

- **Environment Details**:
  - Next.js version
  - React version
  - Node.js version
  - Browser/environment

- **Steps to Reproduce**:
  1. Clear steps to reproduce the issue
  2. Expected vs actual behavior
  3. Error messages or logs

- **Code Examples**:
  ```typescript
  // Minimal code that reproduces the issue
  ```

- **Additional Context**:
  - Screenshots if applicable
  - Code samples demonstrating the issue

### Feature Requests

Include:
- **Use Case Description**: Why is this feature needed?
- **Proposed API Design**: How should it work?
- **Backward Compatibility**: Will this break existing code?
- **Implementation Complexity**: How complex would this be to implement?

### Issue Templates

Use the provided issue templates for consistency:
- Bug Report Template
- Feature Request Template
- Security Issue Template

## Security

### Sensitive Information

- **Never commit credentials or API keys**
- **Use environment variables for configuration**
- **Be mindful of logging sensitive data**
- **Follow OWASP security guidelines**

### Reporting Security Issues

**Do not report security vulnerabilities through public GitHub issues.**

Instead, please email security-related issues to: **rod.higgins@gmail.com**

Include in your report:
- **Description of the vulnerability**
- **Steps to reproduce**
- **Potential impact assessment**
- **Suggested fixes (if any)**

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features (backward compatible)
- **PATCH** (0.0.1): Bug fixes (backward compatible)

### Changelog

All notable changes are documented in `CHANGELOG.md` following the [Keep a Changelog](https://keepachangelog.com/) format.

### Release Checklist

Before releasing:
- Update version in `package.json`
- Update `CHANGELOG.md` with changes
- Run full test suite (`npm run validate`)
- Update documentation if needed
- Create GitHub release with release notes
- Publish to npm registry

### Release Commands

```bash
# Validate everything before release
npm run validate

# Build for production
npm run build

# Publish to npm (runs prepublishOnly script)
npm publish
```

## Getting Help

### Documentation

- **API Documentation**: [Complete API reference](./guides/api.md)
- **Migration Guide**: [Upgrading from older versions](./guides/migration.md)
- **Examples**: [Working examples](./examples/)

### Community Support

- **GitHub Issues**: [Search existing issues](https://github.com/rod-higgins/fat-zebra-nextjs/issues)
- **GitHub Discussions**: [Start a discussion](https://github.com/rod-higgins/fat-zebra-nextjs/discussions)
- **Fat Zebra Docs**: [Official Fat Zebra documentation](https://docs.fatzebra.com)

### Support Channels

- **Technical Issues**: GitHub Issues
- **Feature Discussions**: GitHub Discussions
- **Security Concerns**: rod.higgins@gmail.com
- **Fat Zebra Support**: [Fat Zebra official support](https://www.fatzebra.com/support)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

Key principles:
- **Be respectful** and inclusive
- **Be collaborative** and constructive
- **Be patient** with newcomers
- **Focus on what's best** for the community

## License

By contributing to this project, you agree that your contributions will be licensed under the [MIT License](LICENSE).

### Contribution License Agreement

When you submit a pull request, you're agreeing that:
- Your contribution is your original work
- You have the right to license your contribution under the MIT License
- Your contribution may be redistributed under the MIT License

---

## Thank You!

Thank you for contributing to the Fat Zebra Next.js library! Your contributions help make secure payment processing accessible to developers everywhere.

### Recognition

Contributors are recognized in:
- **GitHub Contributors**: Automatic recognition via GitHub
- **Release Notes**: Major contributors mentioned in releases
- **Documentation**: Contributors credited in appropriate sections

### First-Time Contributors

New to open source? Here are some good first issues:
- Documentation improvements
- Adding tests for existing functionality
- Fixing typos or formatting
- Adding examples for common use cases

Look for issues labeled `good first issue` or `help wanted` in the [GitHub Issues](https://github.com/rod-higgins/fat-zebra-nextjs/issues).

Happy coding!