#!/bin/bash

# Production startup script for Docker container
echo "🚀 Starting Audio Transcription App..."

# Prisma dependencies already installed during build
echo "📦 Prisma dependencies ready..."

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗃️  Running database migrations..."
npx prisma migrate deploy

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p /app/uploads

# Start the application
echo "🌐 Starting Next.js server..."
exec node server.js
