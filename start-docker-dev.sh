#!/bin/bash

# Nearby Locator - Docker Development Setup (Linux/Mac)
# This runs the development version WITHOUT Nginx (with hot reload)

echo "🚀 Starting Nearby Locator - DEVELOPMENT MODE"
echo ""
echo "ℹ️  This setup includes:"
echo "   - Hot reload enabled"
echo "   - React dev server (no Nginx)"
echo "   - Larger image size"
echo "   - Best for active development"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://www.docker.com/get-started"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.example .env
    echo ""
    echo "📝 Please edit .env file and add your Google API key:"
    echo "   GOOGLE_API_KEY=your_actual_google_api_key_here"
    echo ""
    read -p "Press Enter after updating .env file..."
fi

echo ""
echo "🔨 Building Docker images (Development)..."
docker-compose -f docker-compose.dev.yml build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check the error messages above."
    exit 1
fi

echo ""
echo "🚀 Starting services (Development mode with hot reload)..."
docker-compose -f docker-compose.dev.yml up

# Note: Not using -d flag so you can see logs in real-time

echo ""
echo "✅ Development environment is running!"
echo ""
echo "🌐 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo ""
echo "💡 Hot reload is enabled - changes will reflect automatically!"
echo ""
echo "📋 To stop: Press Ctrl+C"
echo ""
