#!/bin/bash

# Development script for audio transcription app

echo "🚀 Starting Audio Transcription App in Development Mode..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📋 Please copy .env.example to .env and update with your values:"
    echo "   cp .env.example .env"
    echo "   Edit .env and add your GOOGLE_API_KEY"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Create uploads directory if it doesn't exist
mkdir -p uploads

# Start development services
echo "🐳 Starting Docker services in development mode..."
docker compose --profile dev up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 15

# Check if services are running
if docker compose ps | grep -q "Up"; then
    echo "✅ Development services are running!"
    echo ""
    echo "🌐 Development server is available at: http://localhost:3001"
    echo "🗄️  Database is available at: localhost:5432"
    echo ""
    echo "📊 To view logs:"
    echo "   docker compose logs -f dev"
    echo ""
    echo "🛑 To stop services:"
    echo "   docker compose --profile dev down"
else
    echo "❌ Some services failed to start. Check logs:"
    echo "   docker compose logs"
fi