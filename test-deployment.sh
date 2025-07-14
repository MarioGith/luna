#!/bin/bash

# Test script to verify Luna AI deployment
set -e

echo "🧪 Luna AI Deployment Test Script"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Function to test database connection
test_database() {
    echo ""
    echo "🔍 Testing database connection..."
    
    if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
        print_success "Database connection working"
    else
        print_error "Database connection failed"
        return 1
    fi
}

# Function to test authentication tables
test_auth_tables() {
    echo ""
    echo "🔍 Testing authentication tables..."
    
    local tables=("Account" "Session" "User" "VerificationToken")
    local failed=0
    
    for table in "${tables[@]}"; do
        if npx prisma db execute --stdin <<< "SELECT 1 FROM \"$table\" LIMIT 1;" > /dev/null 2>&1; then
            print_success "Table '$table' exists"
        else
            print_error "Table '$table' missing"
            failed=1
        fi
    done
    
    if [ $failed -eq 0 ]; then
        print_success "All authentication tables exist"
    else
        print_error "Some authentication tables are missing"
        return 1
    fi
}

# Function to test Prisma client
test_prisma_client() {
    echo ""
    echo "🔍 Testing Prisma client..."
    
    if node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); console.log('Prisma client working');" > /dev/null 2>&1; then
        print_success "Prisma client working"
    else
        print_error "Prisma client failed"
        return 1
    fi
}

# Function to show database schema
show_schema() {
    echo ""
    echo "📋 Database Schema:"
    echo "==================="
    
    # Get all table names
    local tables=$(npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | grep -v "table_name" | grep -v "^$" | sort)
    
    if [ -n "$tables" ]; then
        echo "Tables in database:"
        echo "$tables" | while read -r table; do
            echo "  - $table"
        done
    else
        print_warning "No tables found in database"
    fi
}

# Function to test specific authentication table structure
test_auth_table_structure() {
    echo ""
    echo "🔍 Testing authentication table structure..."
    
    # Test Account table structure
    if npx prisma db execute --stdin <<< "SELECT id, userId, provider, providerAccountId FROM \"Account\" LIMIT 1;" > /dev/null 2>&1; then
        print_success "Account table structure is correct"
    else
        print_error "Account table structure is incorrect"
        return 1
    fi
    
    # Test User table structure
    if npx prisma db execute --stdin <<< "SELECT id, email, name, githubId FROM \"User\" LIMIT 1;" > /dev/null 2>&1; then
        print_success "User table structure is correct"
    else
        print_error "User table structure is incorrect"
        return 1
    fi
    
    # Test Session table structure
    if npx prisma db execute --stdin <<< "SELECT id, sessionToken, userId, expires FROM \"Session\" LIMIT 1;" > /dev/null 2>&1; then
        print_success "Session table structure is correct"
    else
        print_error "Session table structure is incorrect"
        return 1
    fi
}

# Function to fix authentication tables
fix_auth_tables() {
    echo ""
    echo "🔧 Attempting to fix authentication tables..."
    
    local auth_migration_path="prisma/migrations/20250714000000_ensure_auth_tables/migration.sql"
    
    if [ -f "$auth_migration_path" ]; then
        echo "📋 Applying authentication tables migration..."
        npx prisma db execute --file "$auth_migration_path"
        print_success "Authentication tables migration applied"
        
        # Test again
        if test_auth_tables; then
            print_success "Authentication tables fixed successfully"
        else
            print_error "Authentication tables still have issues"
            return 1
        fi
    else
        print_error "Authentication tables migration file not found"
        return 1
    fi
}

# Function to run migration status check
check_migration_status() {
    echo ""
    echo "📋 Checking migration status..."
    
    if npx prisma migrate status; then
        print_success "Migration status check completed"
    else
        print_warning "Migration status check failed"
    fi
}

# Main test function
main() {
    case "${1:-all}" in
        "db")
            test_database
            ;;
        "auth")
            test_auth_tables
            ;;
        "prisma")
            test_prisma_client
            ;;
        "schema")
            show_schema
            ;;
        "structure")
            test_auth_table_structure
            ;;
        "fix")
            fix_auth_tables
            ;;
        "status")
            check_migration_status
            ;;
        "all")
            test_database || exit 1
            test_prisma_client || exit 1
            show_schema
            check_migration_status
            test_auth_tables || {
                print_warning "Authentication tables missing - attempting to fix..."
                fix_auth_tables || exit 1
            }
            test_auth_table_structure || exit 1
            print_success "All tests passed!"
            ;;
        *)
            echo "Usage: $0 [db|auth|prisma|schema|structure|fix|status|all]"
            echo ""
            echo "Options:"
            echo "  db        - Test database connection"
            echo "  auth      - Test authentication tables exist"
            echo "  prisma    - Test Prisma client"
            echo "  schema    - Show database schema"
            echo "  structure - Test authentication table structure"
            echo "  fix       - Fix authentication tables"
            echo "  status    - Check migration status"
            echo "  all       - Run all tests and fix if needed (default)"
            exit 1
            ;;
    esac
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from your project root directory"
    exit 1
fi

# Run main function
main "$@"
