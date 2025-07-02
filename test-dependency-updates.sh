#!/bin/bash

# Test Dependency Updates Script
# This script safely tests dependency updates with automatic rollback on failure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Dependency Update Testing Script${NC}"
echo "========================================"

# Function to print colored messages
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Create backup of current package.json and yarn.lock
backup_dependencies() {
    print_status "Creating backup of current dependencies..."
    cp package.json package.json.backup
    cp yarn.lock yarn.lock.backup
    print_status "Backup created successfully"
}

# Restore backup
restore_dependencies() {
    print_error "Restoring dependencies from backup..."
    cp package.json.backup package.json
    cp yarn.lock.backup yarn.lock
    yarn install --frozen-lockfile
    print_status "Dependencies restored successfully"
}

# Test a specific dependency update
test_dependency_update() {
    local package_name=$1
    local version=$2
    
    echo -e "\n${BLUE}🔍 Testing update: $package_name@$version${NC}"
    
    # Install the updated package
    yarn add $package_name@$version --exact
    
    # Run comprehensive tests
    echo "Running tests for $package_name update..."
    
    # TypeScript compilation
    echo "  - TypeScript compilation..."
    if ! npx tsc --noEmit; then
        print_error "TypeScript compilation failed"
        return 1
    fi
    
    # Linting
    echo "  - Linting..."
    if ! npm run lint; then
        print_error "Linting failed"
        return 1
    fi
    
    # Unit tests
    echo "  - Unit tests..."
    if ! npm run test; then
        print_error "Unit tests failed"
        return 1
    fi
    
    # Production build
    echo "  - Production build..."
    if ! npm run build; then
        print_error "Production build failed"
        return 1
    fi
    
    # Security audit
    echo "  - Security audit..."
    npm audit --audit-level=moderate || print_warning "Security audit completed with warnings"
    
    print_status "All tests passed for $package_name@$version"
    return 0
}

# Test multiple safe updates
test_safe_updates() {
    echo -e "\n${BLUE}🔄 Testing safe minor/patch updates...${NC}"
    
    local safe_updates=(
        "prettier@3.6.2"
        "stylelint@16.21.0"
        "eslint-config-prettier@10.1.5"
        "eslint-plugin-prettier@5.5.1"
        "mochawesome-merge@5.0.0"
        "style-loader@4.0.0"
        "css-loader@7.1.2"
    )
    
    for update in "${safe_updates[@]}"; do
        if test_dependency_update $update; then
            print_status "✅ $update - PASSED"
        else
            print_error "❌ $update - FAILED"
            restore_dependencies
            return 1
        fi
    done
    
    print_status "All safe updates completed successfully!"
}

# Test major updates (more careful)
test_major_updates() {
    echo -e "\n${BLUE}🚨 Testing major updates (high risk)...${NC}"
    
    local major_updates=(
        "jest@30.0.3"
        "jest-environment-jsdom@30.0.2"
        "@types/jest@30.0.0"
    )
    
    for update in "${major_updates[@]}"; do
        echo -e "\n${YELLOW}⚠️  Testing major update: $update${NC}"
        read -p "Continue with this major update? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if test_dependency_update $update; then
                print_status "✅ $update - PASSED"
            else
                print_error "❌ $update - FAILED"
                restore_dependencies
                return 1
            fi
        else
            print_warning "Skipping $update"
        fi
    done
}

# Main execution
main() {
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    # Create backup
    backup_dependencies
    
    # Set trap to restore on failure
    trap 'restore_dependencies; exit 1' ERR
    
    # Test updates based on user choice
    echo -e "\nSelect testing mode:"
    echo "1) Test safe minor/patch updates"
    echo "2) Test major updates (interactive)"
    echo "3) Test all updates"
    echo "4) Custom dependency test"
    
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            test_safe_updates
            ;;
        2)
            test_major_updates
            ;;
        3)
            test_safe_updates
            test_major_updates
            ;;
        4)
            read -p "Enter package name and version (e.g., prettier@3.6.2): " custom_update
            test_dependency_update $custom_update
            ;;
        *)
            print_error "Invalid choice"
            restore_dependencies
            exit 1
            ;;
    esac
    
    # Clean up
    rm -f package.json.backup yarn.lock.backup
    
    echo -e "\n${GREEN}🎉 Dependency testing completed successfully!${NC}"
    echo -e "You can now commit these changes or run additional tests."
}

# Handle script interruption
trap 'echo -e "\n${RED}Script interrupted. Restoring dependencies...${NC}"; restore_dependencies; exit 1' INT

# Run main function
main "$@" 