# Security Policy

## Supported Versions

We actively support the following versions of the Fat Zebra Next.js library with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| 0.1.x   | :x:                |

## Security Standards

This library handles sensitive payment information and follows strict security practices:

### Data Protection

- **No Storage**: Card details are never stored in memory longer than necessary
- **Encryption**: All communication with Fat Zebra APIs uses TLS 1.2+
- **Tokenization**: Support for secure card tokenization to minimize PCI scope
- **3DS2**: Complete 3D Secure 2.0 implementation for enhanced authentication

### Code Security

- **Input Validation**: All user inputs are validated and sanitized
- **Type Safety**: Strict TypeScript configuration prevents common vulnerabilities
- **Dependency Scanning**: Regular security audits of dependencies
- **OWASP Guidelines**: Following OWASP Top 10 security practices

### PCI DSS Compliance

This library is designed to help maintain PCI DSS compliance:

- Card data is transmitted directly to Fat Zebra (PCI DSS Level 1 provider)
- Tokenization reduces PCI scope for merchants
- No persistent storage of sensitive card data
- Secure coding practices throughout

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

### How to Report

Send security reports to: **rod.higgins@gmail.com**

Include the following information:

1. **Description**: Clear description of the vulnerability
2. **Impact**: Potential impact and severity assessment
3. **Reproduction**: Step-by-step instructions to reproduce
4. **Environment**: Affected versions and environments
5. **Proof of Concept**: Code samples or screenshots (if applicable)
6. **Suggested Fix**: Any proposed solutions (optional)

### What to Expect

1. **Acknowledgment**: We'll acknowledge receipt within 48 hours
2. **Initial Assessment**: Initial assessment within 5 business days
3. **Regular Updates**: Progress updates every 10 business days
4. **Resolution**: Target resolution within 90 days for critical issues

### Disclosure Timeline

- **Critical**: Immediate disclosure after fix is available
- **High**: 30 days after fix is available
- **Medium/Low**: 90 days after fix is available

## Security Best Practices

### For Developers

When using this library, follow these security practices:

#### Environment Variables

```bash
# Store credentials securely
FATZEBRA_USERNAME=your_username
FATZEBRA_TOKEN=your_token
FATZEBRA_SHARED_SECRET=your_shared_secret

# Never commit credentials to version control
echo ".env*" >> .gitignore
```

#### Server-Side Processing

```typescript
// Good: Process payments server-side
export async function POST(request: NextRequest) {
  const client = createFatZebraClient({
    username: process.env.FATZEBRA_USERNAME!,
    token: process.env.FATZEBRA_TOKEN!,
    isTestMode: process.env.NODE_ENV !== 'production'
  });
  
  // Process payment securely
}

// Bad: Never expose credentials client-side
const client = createFatZebraClient({
  username: 'exposed_username', // Don't do this!
  token: 'exposed_token'        // Never expose tokens!
});
```

#### Input Validation

```typescript
// Validate and sanitize all inputs
const sanitizedCardData = sanitizeCardData(cardDetails);
const validationResult = validateCard(cardDetails.card_number);

if (!validationResult.isValid) {
  throw new Error('Invalid card details');
}
```

#### Error Handling

```typescript
// Don't expose sensitive information in errors
try {
  const transaction = await processPayment(data);
} catch (error) {
  // Good: Generic error message
  return NextResponse.json(
    { error: 'Payment processing failed' },
    { status: 500 }
  );
  
  // Bad: Exposing internal details
  // return NextResponse.json({ error: error.message });
}
```

### For Production Deployment

#### HTTPS Only

```javascript
// Next.js configuration
module.exports = {
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ];
  }
};
```

#### Content Security Policy

```javascript
// Implement CSP headers
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://gateway.pmnts.io https://gateway.pmnts-sandbox.io;
  connect-src 'self' https://gateway.pmnts.io https://gateway.pmnts-sandbox.io;
  frame-src 'self' https://gateway.pmnts.io https://gateway.pmnts-sandbox.io;
`;
```

#### Rate Limiting

```typescript
// Implement rate limiting for payment endpoints
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many payment attempts'
});
```

## Known Security Considerations

### Client-Side Limitations

- Card details should be transmitted directly to Fat Zebra when possible
- Use tokenization for recurring payments
- Implement proper form validation before submission
- Never log sensitive payment information

### Server-Side Requirements

- Validate all webhook signatures
- Use HTTPS for all production traffic
- Implement proper session management
- Log security events for monitoring

### Testing Security

```typescript
// Security test examples
describe('Security', () => {
  it('should reject invalid card numbers', () => {
    const result = validateCard('invalid');
    expect(result.isValid).toBe(false);
  });

  it('should sanitize input data', () => {
    const malicious = '<script>alert("xss")</script>';
    const sanitized = sanitizeInput(malicious);
    expect(sanitized).not.toContain('<script>');
  });

  it('should verify webhook signatures', () => {
    const isValid = verifyWebhookSignature(payload, signature);
    expect(isValid).toBe(true);
  });
});
```

## Dependency Security

We regularly audit our dependencies for security vulnerabilities:

```bash
# Run security audit
npm audit

# Fix automatically fixable issues
npm audit fix

# Check for outdated packages
npm outdated
```

## Security Updates

Security updates are released as patch versions and include:

- Vulnerability fixes
- Dependency updates
- Security enhancements

Subscribe to our [GitHub releases](https://github.com/rod-higgins/fat-zebra-nextjs/releases) to stay informed about security updates.

## Compliance and Certifications

### PCI DSS

This library supports PCI DSS compliance when used correctly:

- **Scope Reduction**: Tokenization reduces PCI scope
- **Data Protection**: No storage of card data
- **Secure Transmission**: All data encrypted in transit
- **Validation**: Input validation and sanitization

### Additional Standards

- **OWASP**: Following OWASP security guidelines
- **ISO 27001**: Information security management principles
- **SOC 2**: Security and availability controls

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [PCI DSS Standards](https://www.pcisecuritystandards.org/)
- [Fat Zebra Security](https://www.fatzebra.com/security)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)

## Contact

For security-related questions or concerns:

- **Security Email**: rod.higgins@gmail.com
- **General Support**: [GitHub Issues](https://github.com/rod-higgins/fat-zebra-nextjs/issues)
- **Fat Zebra Support**: [Fat Zebra Documentation](https://docs.fatzebra.com)

---

**Remember**: Security is a shared responsibility. While this library provides secure foundations, proper implementation and deployment practices are essential for maintaining security.