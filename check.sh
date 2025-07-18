#!/bin/bash

# Post-Transformation Validation Script
# Validates that the NPM package transformation was successful

set -e

echo "🔍 Validating NPM package transformation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_check() {
    echo -e "${BLUE}🔍 Checking: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

validation_errors=0

# Check directory structure
print_check "Directory structure"
expected_dirs=("src" "src/components" "src/hooks" "src/lib" "src/utils" "src/types" "src/server" "tests" "examples" "docs" ".github/workflows")
for dir in "${expected_dirs[@]}"; do
    if [[ -d "$dir" ]]; then
        print_success "$dir exists"
    else
        print_error "$dir is missing"
        ((validation_errors++))
    fi
done

# Check essential files
print_check "Essential files"
essential_files=("package.json" "tsconfig.json" "tsconfig.build.json" "rollup.config.js" "jest.config.js" ".eslintrc.js" ".prettierrc.js" ".npmignore" "LICENSE" "README.md")
for file in "${essential_files[@]}"; do
    if [[ -f "$file" ]]; then
        print_success "$file exists"
    else
        print_error "$file is missing"
        ((validation_errors++))
    fi
done

# Check source files
print_check "Source files"
src_files=("src/index.ts" "src/components/index.ts" "src/components/PaymentForm.tsx" "src/hooks/index.ts" "src/utils/index.ts" "src/types/index.ts")
for file in "${src_files[@]}"; do
    if [[ -f "$file" ]]; then
        print_success "$file exists"
    else
        print_error "$file is missing"
        ((validation_errors++))
    fi
done

# Check package.json content
print_check "Package.json configuration"
if [[ -f "package.json" ]]; then
    # Check for @fat-zebra/sdk dependency
    if grep -q "@fat-zebra/sdk" package.json; then
        print_success "@fat-zebra/sdk dependency found"
    else
        print_error "@fat-zebra/sdk dependency missing"
        ((validation_errors++))
    fi
    
    # Check for main fields
    required_fields=("main" "module" "types" "exports")
    for field in "${required_fields[@]}"; do
        if grep -q "\"$field\":" package.json; then
            print_success "package.json has $field field"
        else
            print_error "package.json missing $field field"
            ((validation_errors++))
        fi
    done
else
    print_error "package.json not found"
    ((validation_errors++))
fi

# Check TypeScript configuration
print_check "TypeScript configuration"
if [[ -f "tsconfig.json" ]]; then
    if grep -q "\"jsx\": \"react-jsx\"" tsconfig.json; then
        print_success "TypeScript JSX configuration correct"
    else
        print_warning "TypeScript JSX configuration may need updating"
    fi
else
    print_error "tsconfig.json not found"
    ((validation_errors++))
fi

# Test npm scripts
print_check "NPM scripts"
if [[ -f "package.json" ]]; then
    required_scripts=("build" "test" "lint" "type-check")
    for script in "${required_scripts[@]}"; do
        if grep -q "\"$script\":" package.json; then
            print_success "npm script '$script' found"
        else
            print_error "npm script '$script' missing"
            ((validation_errors++))
        fi
    done
fi

# Check if node_modules exists (dependencies installed)
print_check "Dependencies"
if [[ -d "node_modules" ]]; then
    print_success "node_modules directory exists"
    
    # Check for specific dependencies
    if [[ -d "node_modules/@fat-zebra" ]]; then
        print_success "@fat-zebra/sdk installed"
    else
        print_error "@fat-zebra/sdk not installed - run 'npm install'"
        ((validation_errors++))
    fi
else
    print_warning "node_modules not found - run 'npm install'"
fi

# Test TypeScript compilation
print_check "TypeScript compilation"
if command -v npx &> /dev/null; then
    if npx tsc --noEmit --skipLibCheck > /dev/null 2>&1; then
        print_success "TypeScript compilation successful"
    else
        print_error "TypeScript compilation failed"
        echo "Run 'npx tsc --noEmit' to see errors"
        ((validation_errors++))
    fi
else
    print_warning "npx not available, skipping TypeScript check"
fi

# Test build process
print_check "Build process"
if [[ -f "package.json" ]] && command -v npm &> /dev/null; then
    echo "Testing build process..."
    if npm run build > /dev/null 2>&1; then
        print_success "Build process successful"
        
        # Check if dist files were created
        if [[ -f "dist/index.js" ]] && [[ -f "dist/index.d.ts" ]]; then
            print_success "Build output files created"
        else
            print_error "Build output files missing"
            ((validation_errors++))
        fi
    else
        print_error "Build process failed"
        echo "Run 'npm run build' to see errors"
        ((validation_errors++))
    fi
else
    print_warning "Cannot test build process (npm not available or package.json missing)"
fi

# Check Git repository
print_check "Git repository"
if [[ -d ".git" ]]; then
    print_success "Git repository initialized"
    
    # Check if there are any uncommitted changes
    if [[ -n $(git status --porcelain) ]]; then
        print_warning "Uncommitted changes detected"
        echo "Consider committing your changes"
    else
        print_success "Working directory clean"
    fi
else
    print_warning "Git repository not initialized"
    echo "Consider running 'git init' to initialize version control"
fi

# Check GitHub Actions workflow
print_check "GitHub Actions"
if [[ -f ".github/workflows/ci.yml" ]]; then
    print_success "CI workflow exists"
else
    print_error "CI workflow missing"
    ((validation_errors++))
fi

# Check for backup directory
print_check "Backup"
if [[ -d "backup" ]]; then
    print_success "Backup directory exists"
else
    print_warning "No backup directory found"
fi

# Environment check
print_check "Environment setup"
if [[ -f ".env.example" ]]; then
    print_success ".env.example exists"
else
    print_warning ".env.example not found - consider creating one"
fi

# Final summary
echo
echo "============================================"
if [[ $validation_errors -eq 0 ]]; then
    print_success "🎉 All validations passed! Your NPM package is ready."
    echo
    echo "Next steps:"
    echo "1. Update package.json with your organization details"
    echo "2. Test the package with 'npm run test'"
    echo "3. Build the package with 'npm run build'"
    echo "4. Test locally with 'npm pack' before publishing"
    echo "5. Publish with 'npm publish'"
else
    print_error "❌ $validation_errors validation error(s) found."
    echo
    echo "Please fix the errors above before proceeding."
    exit 1
fi

echo
echo "Package validation complete! 🚀"
