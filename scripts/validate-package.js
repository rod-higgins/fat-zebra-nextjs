#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Validation tracking
let validationErrors = 0;
let validationWarnings = 0;

// Logging helpers
function log(message, style = '') {
  const styles = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    bold: '\x1b[1m',
    reset: '\x1b[0m'
  };
  
  const color = styles[style] || '';
  console.log(`${color}${message}${styles.reset}`);
}

function logSuccess(message) {
  log(`${message}`, 'green');
}

function logError(message) {
  log(`${message}`, 'red');
  validationErrors++;
}

function logWarning(message) {
  log(`${message}`, 'yellow');
  validationWarnings++;
}

function logInfo(message) {
  log(`${message}`, 'blue');
}

function logHeader(message) {
  log(`${message}`, 'bold');
}

function addError(message) {
  logError(message);
}

function addWarning(message) {
  logWarning(message);
}

// Utility functions
function fileExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function dirExists(dirPath) {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

function execCommand(command) {
  try {
    execSync(command, { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
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
    'guides',
    '.github',
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

  // Check scripts - FIXED to match actual script names
  const requiredScripts = ['build', 'test', 'lint', 'typecheck'];
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

    if (readme.includes('## Quick Start') || readme.includes('## Usage')) {
      logSuccess('README includes usage section');
    } else {
      addWarning('README missing usage section');
    }
  }

  // Check API documentation
  if (fileExists('guides/api.md')) {
    logSuccess('API documentation exists');
  } else {
    addWarning('Missing API documentation');
  }

  // Check migration guide
  if (fileExists('guides/migration.md')) {
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
  if (auditResult) {
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
  if (tscResult) {
    logSuccess('TypeScript compilation successful');
  } else {
    addError('TypeScript compilation failed - run npx tsc --noEmit for details');
  }

  // Check if build script works
  logInfo('Testing build process...');
  const buildResult = execCommand('npm run build');
  if (buildResult) {
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
  if (testResult) {
    logSuccess('Test suite passed');
  } else {
    addError('Test suite failed - run npm test for details');
  }

  // Check test coverage - FIXED script name
  logInfo('Checking test coverage...');
  const coverageResult = execCommand('npm run testcoverage -- --passWithNoTests');
  if (coverageResult) {
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
  if (lintResult) {
    logSuccess('Linting passed');
  } else {
    addError('Linting failed - run npm run lint for details');
  }

  // Check formatting - FIXED script name
  logInfo('Checking code formatting...');
  const formatResult = execCommand('npm run checkformat');
  if (formatResult) {
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
    logSuccess('Package size check completed');
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