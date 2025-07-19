#!/usr/bin/env node

/**
 * Package Validation Script
 * Validates that the Fat Zebra Next.js package is correctly structured and ready for release
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logHeader(message) {
  log(`\n${colors.bold}🔍 ${message}${colors.reset}`, 'blue');
}

// Validation state
let validationErrors = 0;
let validationWarnings = 0;

function addError(message) {
  logError(message);
  validationErrors++;
}

function addWarning(message) {
  logWarning(message);
  validationWarnings++;
}

// Check if file exists
function fileExists(filePath) {
  return fs.existsSync(path.resolve(filePath));
}

// Check if directory exists
function dirExists(dirPath) {
  return fs.existsSync(path.resolve(dirPath)) && fs.statSync(path.resolve(dirPath)).isDirectory();
}

// Read and parse JSON file
function readJsonFile(filePath) {
  try {
    const content = fs.readFileSync(path.resolve(filePath), 'utf8');
    return JSON.parse(content);
  } catch (error) {
    addError(`Failed to read or parse ${filePath}: ${error.message}`);
    return null;
  }
}

// Execute command and return output
function execCommand(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe', ...options });
  } catch (error) {
    return null;
  }
}

// Validation functions
function validateDirectoryStructure() {
  logHeader('Validating Directory Structure');

  const requiredDirs = [
    'src',
    'src/components',
    'src/hooks',
    'src/lib',
    'src/utils',
    'src/types',
    'src/server',
    'tests',
    'examples',
    'docs',
    '.github/workflows'
  ];

  requiredDirs.forEach(dir => {
    if (dirExists(dir)) {
      logSuccess(`Directory exists: ${dir}`);
    } else {
      addError(`Missing directory: ${dir}`);
    }
  });
}

function validateEssentialFiles() {
  logHeader('Validating Essential Files');

  const requiredFiles = [
    'package.json',
    'tsconfig.json',
    'tsconfig.build.json',
    'rollup.config.js',
    'jest.config.js',
    '.eslintrc.js',
    '.prettierrc.js',
    '.npmignore',
    'LICENSE',
    'README.md',
    'CHANGELOG.md',
    'CONTRIBUTING.md',
    'SECURITY.md'
  ];

  requiredFiles.forEach(file => {
    if (fileExists(file)) {
      logSuccess(`File exists: ${file}`);
    } else {
      addError(`Missing file: ${file}`);
    }
  });
}

function validateSourceFiles() {
  logHeader('Validating Source Files');

  const sourceFiles = [
    'src/index.ts',
    'src/components/index.ts',
    'src/components/PaymentForm.tsx',
    'src/hooks/index.ts',
    'src/hooks/usePayment.ts',
    'src/lib/index.ts',
    'src/lib/client.ts',
    'src/utils/index.ts',
    'src/types/index.ts',
    'src/server/index.ts',
    'src/server/routes.ts'
  ];

  sourceFiles.forEach(file => {
    if (fileExists(file)) {
      logSuccess(`Source file exists: ${file}`);
    } else {
      addError(`Missing source file: ${file}`);
    }
  });
}

function validatePackageJson() {
  logHeader('Validating package.json');

  const pkg = readJsonFile('package.json');
  if (!pkg) return;

  // Check required fields
  const requiredFields = ['name', 'version', 'description', 'main', 'module', 'types', 'exports'];
  requiredFields.forEach(field => {
    if (pkg[field]) {
      logSuccess(`package.json has ${field} field`);
    } else {
      addError(`package.json missing ${field} field`);
    }
  });

  // Check dependencies
  if (pkg.dependencies && pkg.dependencies['@fat-zebra/sdk']) {
    logSuccess('@fat-zebra/sdk dependency found');
  } else {
    addError('@fat-zebra/sdk dependency missing');
  }

  // Check scripts
  const requiredScripts = ['build', 'test', 'lint', 'type-check'];
  requiredScripts.forEach(script => {
    if (pkg.scripts && pkg.scripts[script]) {
      logSuccess(`npm script '${script}' found`);
    } else {
      addError(`npm script '${script}' missing`);
    }
  });

  // Check files field
  if (pkg.files && pkg.files.includes('dist')) {
    logSuccess('package.json includes dist in files');
  } else {
    addError('package.json missing dist in files array');
  }

  // Check peer dependencies
  const expectedPeerDeps = ['next', 'react', 'react-dom'];
  expectedPeerDeps.forEach(dep => {
    if (pkg.peerDependencies && pkg.peerDependencies[dep]) {
      logSuccess(`Peer dependency ${dep} found`);
    } else {
      addWarning(`Consider adding ${dep} as peer dependency`);
    }
  });
}

function validateTypeScriptConfig() {
  logHeader('Validating TypeScript Configuration');

  // Check main tsconfig.json
  const tsconfig = readJsonFile('tsconfig.json');
  if (tsconfig) {
    if (tsconfig.compilerOptions && tsconfig.compilerOptions.strict) {
      logSuccess('TypeScript strict mode enabled');
    } else {
      addWarning('Consider enabling TypeScript strict mode');
    }

    if (tsconfig.compilerOptions && tsconfig.compilerOptions.jsx === 'react-jsx') {
      logSuccess('TypeScript JSX configuration correct');
    } else {
      addWarning('TypeScript JSX configuration may need updating');
    }
  }

  // Check build config
  if (fileExists('tsconfig.build.json')) {
    logSuccess('Build TypeScript configuration exists');
  } else {
    addError('Missing tsconfig.build.json');
  }
}

function validateTestConfiguration() {
  logHeader('Validating Test Configuration');

  // Check Jest config
  if (fileExists('jest.config.js')) {
    logSuccess('Jest configuration exists');
  } else {
    addError('Missing jest.config.js');
  }

  // Check test setup
  if (fileExists('tests/setup.ts')) {
    logSuccess('Test setup file exists');
  } else {
    addError('Missing tests/setup.ts');
  }

  // Check for test files
  const testFiles = [
    'tests/lib/client.test.ts',
    'tests/components/PaymentForm.test.tsx',
    'tests/hooks/usePayment.test.ts',
    'tests/utils/index.test.ts'
  ];

  testFiles.forEach(file => {
    if (fileExists(file)) {
      logSuccess(`Test file exists: ${file}`);
    } else {
      addWarning(`Missing test file: ${file}`);
    }
  });
}

function validateBuildConfiguration() {
  logHeader('Validating Build Configuration');

  // Check Rollup config
  if (fileExists('rollup.config.js')) {
    logSuccess('Rollup configuration exists');
  } else {
    addError('Missing rollup.config.js');
  }

  // Check if npmignore excludes source files
  if (fileExists('.npmignore')) {
    const npmignore = fs.readFileSync('.npmignore', 'utf8');
    if (npmignore.includes('src/')) {
      logSuccess('.npmignore excludes source files');
    } else {
      addWarning('.npmignore should exclude source files');
    }
  }
}

function validateLintingAndFormatting() {
  logHeader('Validating Linting and Formatting');

  // Check ESLint config
  if (fileExists('.eslintrc.js')) {
    logSuccess('ESLint configuration exists');
  } else {
    addError('Missing .eslintrc.js');
  }

  // Check Prettier config
  if (fileExists('.prettierrc.js')) {
    logSuccess('Prettier configuration exists');
  } else {
    addError('Missing .prettierrc.js');
  }
}

function validateDocumentation() {
  logHeader('Validating Documentation');

  // Check README
  if (fileExists('README.md')) {
    const readme = fs.readFileSync('README.md', 'utf8');
    if (readme.includes('# Fat Zebra Next.js Library')) {
      logSuccess('README has proper title');
    } else {
      addWarning('README title could be improved');
    }

    if (readme.includes('## Installation')) {
      logSuccess('README includes installation section');
    } else {
      addWarning('README missing installation section');
    }

    if (readme.includes('## Usage')) {
      logSuccess('README includes usage section');
    } else {
      addWarning('README missing usage section');
    }
  }

  // Check API documentation
  if (fileExists('docs/api.md')) {
    logSuccess('API documentation exists');
  } else {
    addWarning('Missing API documentation');
  }

  // Check migration guide
  if (fileExists('docs/migration.md')) {
    logSuccess('Migration guide exists');
  } else {
    addWarning('Missing migration guide');
  }

  // Check examples
  if (dirExists('examples')) {
    const examples = fs.readdirSync('examples');
    if (examples.length > 0) {
      logSuccess(`Found ${examples.length} example(s)`);
    } else {
      addWarning('No examples found');
    }
  }
}

function validateGitHubConfiguration() {
  logHeader('Validating GitHub Configuration');

  // Check GitHub workflows
  if (fileExists('.github/workflows/ci.yml')) {
    logSuccess('CI workflow exists');
  } else {
    addError('Missing CI workflow');
  }

  // Check issue templates
  if (dirExists('.github/ISSUE_TEMPLATE')) {
    logSuccess('Issue templates directory exists');
  } else {
    addWarning('Consider adding issue templates');
  }

  // Check pull request template
  if (fileExists('.github/pull_request_template.md')) {
    logSuccess('Pull request template exists');
  } else {
    addWarning('Consider adding pull request template');
  }
}

function validateDependencies() {
  logHeader('Validating Dependencies');

  // Check if node_modules exists
  if (dirExists('node_modules')) {
    logSuccess('Dependencies installed');

    // Check for Fat Zebra SDK
    if (dirExists('node_modules/@fat-zebra')) {
      logSuccess('@fat-zebra/sdk installed');
    } else {
      addError('@fat-zebra/sdk not installed - run npm install');
    }
  } else {
    addError('Dependencies not installed - run npm install');
    return;
  }

  // Run security audit
  logInfo('Running security audit...');
  const auditResult = execCommand('npm audit --audit-level=moderate');
  if (auditResult !== null) {
    logSuccess('Security audit passed');
  } else {
    addWarning('Security audit found issues - run npm audit for details');
  }
}

function validateBuild() {
  logHeader('Validating Build Process');

  // Check if TypeScript compiles
  logInfo('Checking TypeScript compilation...');
  const tscResult = execCommand('npx tsc --noEmit');
  if (tscResult !== null) {
    logSuccess('TypeScript compilation successful');
  } else {
    addError('TypeScript compilation failed - run npx tsc --noEmit for details');
  }

  // Check if build script works
  logInfo('Testing build process...');
  const buildResult = execCommand('npm run build');
  if (buildResult !== null) {
    logSuccess('Build process successful');

    // Check if build artifacts exist
    const buildArtifacts = ['dist/index.js', 'dist/index.esm.js', 'dist/index.d.ts'];
    buildArtifacts.forEach(artifact => {
      if (fileExists(artifact)) {
        logSuccess(`Build artifact exists: ${artifact}`);
      } else {
        addError(`Missing build artifact: ${artifact}`);
      }
    });
  } else {
    addError('Build process failed - run npm run build for details');
  }
}

function validateTests() {
  logHeader('Validating Tests');

  // Run tests
  logInfo('Running test suite...');
  const testResult = execCommand('npm test -- --passWithNoTests');
  if (testResult !== null) {
    logSuccess('Test suite passed');
  } else {
    addError('Test suite failed - run npm test for details');
  }

  // Check test coverage
  logInfo('Checking test coverage...');
  const coverageResult = execCommand('npm run test:coverage -- --passWithNoTests');
  if (coverageResult !== null) {
    logSuccess('Coverage report generated');
  } else {
    addWarning('Coverage report generation failed');
  }
}

function validateLinting() {
  logHeader('Validating Code Quality');

  // Run ESLint
  logInfo('Running ESLint...');
  const lintResult = execCommand('npm run lint');
  if (lintResult !== null) {
    logSuccess('Linting passed');
  } else {
    addError('Linting failed - run npm run lint for details');
  }

  // Check formatting
  logInfo('Checking code formatting...');
  const formatResult = execCommand('npm run check-format');
  if (formatResult !== null) {
    logSuccess('Code formatting correct');
  } else {
    addWarning('Code formatting issues - run npm run format to fix');
  }
}

function validatePackageIntegrity() {
  logHeader('Validating Package Integrity');

  // Check package size
  logInfo('Checking package size...');
  const packResult = execCommand('npm pack --dry-run');
  if (packResult) {
    const lines = packResult.trim().split('\n');
    const sizeLine = lines.find(line => line.includes('tarball size'));
    if (sizeLine) {
      logSuccess(`Package size: ${sizeLine.split(':')[1].trim()}`);
    }
  }

  // Validate package contents
  const pkg = readJsonFile('package.json');
  if (pkg && pkg.files) {
    pkg.files.forEach(file => {
      if (fileExists(file) || dirExists(file)) {
        logSuccess(`Package file/directory exists: ${file}`);
      } else {
        addError(`Package file/directory missing: ${file}`);
      }
    });
  }
}

// Main validation function
function runValidation() {
  console.log('\n' + '='.repeat(60));
  log('Fat Zebra Next.js Library - Package Validation', 'bold');
  console.log('='.repeat(60));

  validateDirectoryStructure();
  validateEssentialFiles();
  validateSourceFiles();
  validatePackageJson();
  validateTypeScriptConfig();
  validateTestConfiguration();
  validateBuildConfiguration();
  validateLintingAndFormatting();
  validateDocumentation();
  validateGitHubConfiguration();
  validateDependencies();
  
  // Only run build/test validation if basic structure is correct
  if (validationErrors === 0) {
    validateBuild();
    validateTests();
    validateLinting();
    validatePackageIntegrity();
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  log('Validation Summary', 'bold');
  console.log('='.repeat(60));

  if (validationErrors === 0 && validationWarnings === 0) {
    logSuccess('Package validation completed successfully!');
    logInfo('The package is ready for release.');
  } else {
    if (validationErrors > 0) {
      logError(`Found ${validationErrors} error(s) that must be fixed.`);
    }
    if (validationWarnings > 0) {
      logWarning(`Found ${validationWarnings} warning(s) that should be addressed.`);
    }
    
    if (validationErrors > 0) {
      log('\nPlease fix all errors before proceeding with release.', 'red');
      process.exit(1);
    } else {
      log('\nWarnings found but package can be released.', 'yellow');
    }
  }

  console.log('');
}

// Run validation if called directly
if (require.main === module) {
  runValidation();
}

module.exports = {
  runValidation,
  validationErrors,
  validationWarnings
};