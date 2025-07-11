#!/bin/bash

# Stop script for audio transcription app

echo "🛑 Stopping Audio Transcription App..."

# Stop all services
docker compose down

# Stop development services if they're running
docker compose --profile dev down

echo "✅ All services stopped."
echo ""
echo "💡 To remove all data (including database):"
echo "   docker compose down -v"
echo ""
echo "🗑️  To remove all containers and images:"
echo "   docker compose down --rmi all -v"