#!/bin/bash

# Luna AI Deployment Script for Coolify
# This script helps you deploy your app with proper configuration

set -e

echo "🚀 Luna AI Deployment Helper for Coolify"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to generate secure secrets
generate_secrets() {
    echo ""
    echo "🔐 REQUIRED SECRETS FOR COOLIFY"
    echo "==============================="
    
    echo ""
    echo "1. NextAuth Secret (copy this to NEXTAUTH_SECRET):"
    echo "   $(openssl rand -base64 32)"
    
    echo ""
    echo "2. Database Password (copy this to your DB setup):"
    echo "   $(openssl rand -base64 24)"
    
    echo ""
    print_info "Save these secrets securely - you'll need them in Coolify!"
}

# Function to show environment variables template
show_env_template() {
    echo ""
    echo "📋 ENVIRONMENT VARIABLES FOR COOLIFY"
    echo "===================================="
    
    cat << 'EOF'

Copy these environment variables to your Coolify app service:

# Database (update with your actual database details)
DATABASE_URL=postgresql://postgres:[DB_PASSWORD]@luna-ai-db:5432/audio_transcription?schema=public

# NextAuth.js (CRITICAL - generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=[GENERATE_SECRET_ABOVE]
NEXTAUTH_URL=https://your-domain.com

# GitHub OAuth (create new OAuth app for production)
GITHUB_ID=[YOUR_PRODUCTION_OAUTH_CLIENT_ID]
GITHUB_SECRET=[YOUR_PRODUCTION_OAUTH_CLIENT_SECRET]
ALLOWED_GITHUB_USERNAME=[YOUR_GITHUB_USERNAME]

# Google AI API
GOOGLE_API_KEY=[YOUR_GEMINI_API_KEY]

# Application Settings
NODE_ENV=production
PORT=3000

# Optional: Reset database on startup (set to "true" for first deployment)
RESET_DATABASE=false

EOF
}

# Function to show Coolify setup steps
show_coolify_steps() {
    echo ""
    echo "🎯 COOLIFY DEPLOYMENT STEPS"
    echo "==========================="
    
    cat << 'EOF'

STEP 1: Create Database Service
-------------------------------
1. In Coolify, create a new service
2. Choose "PostgreSQL" 
3. Use image: pgvector/pgvector:pg15
4. Set service name: luna-ai-db
5. Environment variables:
   - POSTGRES_DB=audio_transcription
   - POSTGRES_USER=postgres
   - POSTGRES_PASSWORD=[use generated password above]
6. Add persistent volume: /var/lib/postgresql/data
7. Deploy and wait for it to be ready

STEP 2: Enable Database Extensions
----------------------------------
1. Connect to your database (use Coolify's database console)
2. Run these commands:
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS vector;

STEP 3: Create App Service
--------------------------
1. In Coolify, create a new service
2. Choose "Git Repository"
3. Connect your repository
4. Set build pack: "Docker"
5. Dockerfile path: ./Dockerfile
6. Set service name: luna-ai-app
7. Add all environment variables (see template above)
8. Add persistent volume: /app/uploads
9. Set port: 3000
10. Deploy!

STEP 4: Setup GitHub OAuth
---------------------------
1. Go to: https://github.com/settings/developers
2. Create "New OAuth App"
3. Set:
   - Application name: Luna AI (Production)
   - Homepage URL: https://your-domain.com
   - Authorization callback URL: https://your-domain.com/api/auth/callback/github
4. Copy Client ID and Secret to Coolify environment variables

STEP 5: Test Deployment
-----------------------
1. Check logs in Coolify for successful startup
2. Visit your domain
3. Test GitHub authentication
4. Upload test audio file
5. Verify transcription works

EOF
}

# Function to show troubleshooting tips
show_troubleshooting() {
    echo ""
    echo "🔧 TROUBLESHOOTING TIPS"
    echo "======================"
    
    cat << 'EOF'

Common Issues & Solutions:
-------------------------

1. "Account table does not exist" error:
   → The new docker-start.sh script will automatically fix this
   → It will reset the database if tables are missing
   → Check logs for "Database reset completed" message

2. Build fails:
   → Ensure you're using the correct Dockerfile
   → Check that all dependencies are in package.json
   → The next.config.ts is configured to skip lint/type errors

3. Database connection fails:
   → Check DATABASE_URL format
   → Ensure database service is running
   → Verify network connectivity between services

4. Authentication redirect loop:
   → Check NEXTAUTH_URL matches your domain exactly
   → Verify GitHub OAuth callback URL is correct
   → Ensure NEXTAUTH_SECRET is set and consistent

5. File upload issues:
   → Check that /app/uploads volume is mounted
   → Verify volume permissions (should be writable)

6. First time deployment with missing tables:
   → Set RESET_DATABASE=true in environment variables
   → This will ensure clean database setup
   → Remove after successful deployment

EOF
}

# Function to validate current setup
validate_setup() {
    echo ""
    echo "🔍 VALIDATING CURRENT SETUP"
    echo "==========================="
    
    # Check if essential files exist
    files_to_check=(
        "Dockerfile"
        "docker-start.sh"
        "package.json"
        "prisma/schema.prisma"
        "next.config.ts"
    )
    
    for file in "${files_to_check[@]}"; do
        if [ -f "$file" ]; then
            print_status "Found: $file"
        else
            print_error "Missing: $file"
        fi
    done
    
    # Check docker-start.sh is executable
    if [ -x "docker-start.sh" ]; then
        print_status "docker-start.sh is executable"
    else
        print_warning "Making docker-start.sh executable..."
        chmod +x docker-start.sh
        print_status "docker-start.sh is now executable"
    fi
    
    # Check if migrations exist
    if [ -d "prisma/migrations" ]; then
        migration_count=$(find prisma/migrations -name "*.sql" | wc -l)
        print_status "Found $migration_count migration files"
    else
        print_error "No migrations directory found"
    fi
}

# Main function
main() {
    echo ""
    print_info "This script will help you deploy Luna AI to Coolify"
    echo ""
    
    case "${1:-all}" in
        "secrets")
            generate_secrets
            ;;
        "env")
            show_env_template
            ;;
        "steps")
            show_coolify_steps
            ;;
        "troubleshoot")
            show_troubleshooting
            ;;
        "validate")
            validate_setup
            ;;
        "all")
            validate_setup
            generate_secrets
            show_env_template
            show_coolify_steps
            show_troubleshooting
            ;;
        *)
            echo "Usage: $0 [secrets|env|steps|troubleshoot|validate|all]"
            echo ""
            echo "Options:"
            echo "  secrets      - Generate required secrets"
            echo "  env          - Show environment variables template"
            echo "  steps        - Show Coolify deployment steps"
            echo "  troubleshoot - Show troubleshooting tips"
            echo "  validate     - Validate current setup"
            echo "  all          - Show everything (default)"
            ;;
    esac
    
    echo ""
    print_status "Deployment helper completed!"
    print_info "Your enhanced docker-start.sh will automatically handle database setup"
    print_info "Visit your deployed app and test the authentication flow"
    echo ""
}

# Make sure we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from your project root directory"
    exit 1
fi

# Run main function
main "$@"
