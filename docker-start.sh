#!/bin/bash

# Enhanced Production startup script for Docker container
set -e  # Exit on any error

echo "🚀 Starting Luna AI Audio Transcription App..."
echo "📊 Environment: $NODE_ENV"
echo "🌐 Port: $PORT"

# Function to check if database is accessible
check_database() {
    echo "🔍 Checking database connection..."
    
    # Wait for database to be ready (max 30 seconds)
    for i in {1..30}; do
        if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
            echo "✅ Database connection established"
            return 0
        fi
        echo "⏳ Waiting for database... ($i/30)"
        sleep 2
    done
    
    echo "❌ Database connection failed after 30 seconds"
    exit 1
}

# Function to reset database (use with caution)
reset_database() {
    echo "🗑️  Resetting database..."
    npx prisma migrate reset --force --skip-generate
    echo "✅ Database reset completed"
}

# Function to deploy migrations
deploy_migrations() {
    echo "🗃️  Deploying database migrations..."
    
    # Check if migrations are needed
    if ! npx prisma migrate status > /dev/null 2>&1; then
        echo "📋 Migration status check failed, applying migrations..."
        npx prisma migrate deploy
    else
        echo "📋 Checking migration status..."
        npx prisma migrate status
        
        # Apply any pending migrations
        npx prisma migrate deploy
    fi
    
    echo "✅ Database migrations completed"
}

# Function to verify critical tables exist
verify_tables() {
    echo "🔍 Verifying critical tables exist..."
    
    local tables=("Account" "Session" "User" "VerificationToken" "AudioTranscription")
    
    for table in "${tables[@]}"; do
        if npx prisma db execute --stdin <<< "SELECT 1 FROM \"$table\" LIMIT 1;" > /dev/null 2>&1; then
            echo "✅ Table '$table' exists"
        else
            echo "❌ Table '$table' missing - this will cause authentication issues"
            return 1
        fi
    done
    
    echo "✅ All critical tables verified"
}

# Function to generate Prisma client
generate_client() {
    echo "🔧 Generating Prisma client..."
    npx prisma generate
    echo "✅ Prisma client generated"
}

# Function to create necessary directories
setup_directories() {
    echo "📁 Setting up directories..."
    
    # Create uploads directory with proper permissions
    mkdir -p /app/uploads
    chmod 755 /app/uploads
    
    # Ensure nextjs user owns the uploads directory
    if [ "$(id -u)" = "0" ]; then
        chown -R nextjs:nodejs /app/uploads
    fi
    
    echo "✅ Directories configured"
}

# Function to check environment variables
check_env() {
    echo "🔍 Checking environment variables..."
    
    local required_vars=("DATABASE_URL" "NEXTAUTH_SECRET" "NEXTAUTH_URL" "GITHUB_ID" "GITHUB_SECRET")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo "❌ Missing required environment variables:"
        printf "   - %s\n" "${missing_vars[@]}"
        echo "🚨 Application will not work without these variables"
        exit 1
    fi
    
    echo "✅ Environment variables validated"
}

# Function to run health check
health_check() {
    echo "🏥 Running pre-startup health check..."
    
    # Check if we can connect to database
    if ! npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
        echo "❌ Database health check failed"
        exit 1
    fi
    
    # Check if Prisma client is working
    if ! node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); console.log('Prisma client OK');" > /dev/null 2>&1; then
        echo "❌ Prisma client health check failed"
        exit 1
    fi
    
    echo "✅ Health check passed"
}

# Main deployment process
main() {
    echo "🎯 Starting deployment process..."
    
    # Step 1: Check environment
    check_env
    
    # Step 2: Setup directories
    setup_directories
    
    # Step 3: Check database connection
    check_database
    
    # Step 4: Generate Prisma client
    generate_client
    
    # Step 5: Handle database reset if requested
    if [ "$RESET_DATABASE" = "true" ]; then
        echo "⚠️  Database reset requested..."
        reset_database
    fi
    
    # Step 6: Deploy migrations
    deploy_migrations
    
    # Step 7: Verify tables exist
    if ! verify_tables; then
        echo "🚨 Critical tables missing - attempting to fix..."
        
        # Try to reset and redeploy if tables are missing
        echo "🔄 Attempting database reset and migration re-deployment..."
        reset_database
        deploy_migrations
        
        # Verify again
        if ! verify_tables; then
            echo "❌ Unable to create required tables - deployment failed"
            exit 1
        fi
    fi
    
    # Step 8: Final health check
    health_check
    
    echo "🎉 Deployment preparation completed successfully!"
    echo "🚀 Starting Next.js server..."
    echo "📱 App will be available at: $NEXTAUTH_URL"
    echo "🔐 Authentication: GitHub OAuth"
    echo "🗄️  Database: PostgreSQL with pgvector"
    echo "---"
    
    # Start the application
    exec node server.js
}

# Error handling
trap 'echo "❌ Deployment failed! Check logs above for details."; exit 1' ERR

# Run main function
main "$@"
