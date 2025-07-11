#!/bin/bash

# Start script for audio transcription app

# Parse command line arguments
REBUILD=false
for arg in "$@"; do
    case $arg in
        -r|--rebuild)
            REBUILD=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -r, --rebuild    Rebuild Docker images before starting"
            echo "  -h, --help       Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0               Start the application"
            echo "  $0 --rebuild     Rebuild and start the application"
            exit 0
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

if [ "$REBUILD" = true ]; then
    echo "🔨 Rebuilding and Starting Audio Transcription App with Docker..."
else
    echo "🚀 Starting Audio Transcription App with Docker..."
fi

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

# Start services
if [ "$REBUILD" = true ]; then
    echo "🔨 Rebuilding and starting Docker services..."
    docker compose up -d --build
else
    echo "🐳 Starting Docker services..."
    docker compose up -d
fi

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker compose ps | grep -q "Up"; then
    echo "✅ Services are running!"
    echo ""
    echo "🌐 Application is available at: http://localhost:3000"
    echo "🗄️  Database is available at: localhost:5432"
    echo ""
    echo "📊 To view logs:"
    echo "   docker compose logs -f app"
    echo ""
    echo "🔨 To restart with rebuild:"
    echo "   ./docker-scripts/start.sh --rebuild"
    echo ""
    echo "🛑 To stop services:"
    echo "   docker compose down"
else
    echo "❌ Some services failed to start. Check logs:"
    echo "   docker compose logs"
fi
