# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.6] - 2025-07-20 - **FIRST NPM RELEASE** 🎉

### Added
- **🚀 First NPM Publication**: Package now available on npm registry as `@fwcgovau/fat-zebra-nextjs@0.5.6`
- Complete CI/CD pipeline with GitHub Actions for automated testing, building, and publishing
- Comprehensive package validation script with pre-publish checks
- Production-ready build artifacts with proper ES modules and CommonJS support
- Complete npm scripts for all development workflows

### Changed
- **BREAKING**: Updated all GitHub workflows to use correct npm script names:
  - `npm run type-check` → `npm run typecheck`
  - `npm run check-format` → `npm run checkformat` 
  - `npm run test:coverage` → `npm run testcoverage`
- Enhanced CI/CD pipeline with proper artifact management and security checks
- Improved package.json with correct script names and build configurations
- Updated documentation with installation instructions for npm package

### Fixed
- GitHub Actions workflows now use correct npm script names matching package.json
- Resolved build pipeline issues that were preventing npm publication
- Fixed TypeScript compilation issues in CI environment
- Corrected package validation and artifact generation

### Security
- Added comprehensive security auditing in CI pipeline
- Enhanced dependency vulnerability scanning
- Improved package integrity validation

## [0.5.5] - 2025-07-19

### Added
- All tests passing with comprehensive coverage >80%
- Enhanced build system with proper artifact generation
- Improved TypeScript type definitions and strict mode compliance

### Changed
- Refined build process for production readiness
- Updated development workflows for better developer experience

### Fixed
- Resolved remaining TypeScript compilation issues
- Fixed test suite reliability issues

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

---

## Release Notes

### v0.5.6 - First NPM Release

This is a significant milestone as the first version of `@fwcgovau/fat-zebra-nextjs` to be published to the npm registry. The package is now production-ready with:

- ✅ All tests passing
- ✅ Complete build pipeline
- ✅ Proper TypeScript declarations
- ✅ ES modules and CommonJS support
- ✅ Comprehensive documentation
- ✅ CI/CD automation

### Installation

```bash
npm install @fwcgovau/fat-zebra-nextjs @fat-zebra/sdk
```

### Key Features

- **OAuth Authentication**: Full client-side OAuth support
- **3DS2 Integration**: Complete 3D Secure 2.0 implementation
- **TypeScript First**: Strict TypeScript with comprehensive types
- **Next.js Optimized**: Built specifically for Next.js 14+
- **React 18 Compatible**: Fully compatible with React 18+
- **Modern SDK**: Built on official `@fat-zebra/sdk` v1.5.9

### Migration from Pre-release

If you were using a pre-release version, update to the official npm package:

```bash
npm uninstall your-previous-package
npm install @fwcgovau/fat-zebra-nextjs @fat-zebra/sdk
```

No code changes are required for migration from v0.5.5 to v0.5.6.