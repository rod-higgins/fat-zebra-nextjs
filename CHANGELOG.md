# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-07-19

### Added
- OAuth authentication support for client-side SDK integration
- 3D Secure 2.0 (3DS2) authentication support
- Complete TypeScript type definitions
- Server-side verification hash generation
- Enhanced error handling with custom FatZebraError class
- Pre-built React components (PaymentForm, VerifyCard integration)
- Multiple React hooks (usePayment, useOAuthPayment, usePaymentEvents)
- Comprehensive utility functions for card validation and formatting
- Support for tokenization with secure verification
- Next.js API route helpers
- Complete test suite with >80% coverage
- Subscription payment support
- Refund processing capabilities
- Webhook signature verification
- Settlement data retrieval

### Changed
- **BREAKING**: Updated to use `@fat-zebra/sdk` v1.5.9 as base dependency
- **BREAKING**: New package structure with proper ES modules and CommonJS support
- **BREAKING**: Updated API response handling
- **BREAKING**: New configuration format
- Improved build system with Rollup
- Enhanced TypeScript configuration with strict mode
- Updated documentation with comprehensive examples

### Removed
- **BREAKING**: Legacy API methods that don't align with official SDK
- **BREAKING**: Old configuration format
- Deprecated utility functions

### Security
- Added verification hash requirement for tokenization
- Enhanced webhook signature verification
- Improved error handling to prevent information leakage

## [0.1.0] - Previous Versions

### Added
- Basic payment processing
- Simple card tokenization
- Basic Next.js integration