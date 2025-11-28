#!/bin/bash

# Nearby Locator - Docker Production Setup (Linux/Mac)
# This runs the production version WITH Nginx (optimized)

echo "🚀 Starting Nearby Locator - PRODUCTION MODE"
echo ""
echo "ℹ️  This setup includes:"
echo "   - Nginx web server"
echo "   - Optimized static files"
echo "   - Small image size (25MB)"
echo "   - Best for deployment"
echo ""
echo "💡 For development with hot reload, use: ./start-docker-dev.sh"
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

# Check if GOOGLE_API_KEY is set
if grep -q "your_google_api_key_here" .env; then
    echo "⚠️  Warning: GOOGLE_API_KEY is not configured in .env file"
    echo "   The application may not work properly without a valid API key."
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "🔨 Building Docker images..."
docker-compose build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check the error messages above."
    exit 1
fi

echo ""
echo "🚀 Starting services..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Failed to start services. Please check the error messages above."
    exit 1
fi

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check service status
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "✅ Application is running!"
echo ""
echo "🌐 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo "   Health:   http://localhost:5000/health"
echo ""
echo "📋 Useful commands:"
echo "   View logs:        docker-compose logs -f"
echo "   Stop services:    docker-compose down"
echo "   Restart services: docker-compose restart"
echo ""
