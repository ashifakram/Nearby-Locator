@echo off
REM Nearby Locator - Docker Development Setup (Windows)
REM This runs the development version WITHOUT Nginx (with hot reload)

echo 🚀 Starting Nearby Locator - DEVELOPMENT MODE
echo.
echo ℹ️  This setup includes:
echo    - Hot reload enabled
echo    - React dev server (no Nginx)
echo    - Larger image size
echo    - Best for active development
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker first.
    echo    Visit: https://www.docker.com/get-started
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo ⚠️  .env file not found. Creating from template...
    copy .env.example .env
    echo.
    echo 📝 Please edit .env file and add your Google API key:
    echo    GOOGLE_API_KEY=your_actual_google_api_key_here
    echo.
    pause
)

echo.
echo 🔨 Building Docker images (Development)...
docker-compose -f docker-compose.dev.yml build

if errorlevel 1 (
    echo ❌ Build failed. Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo 🚀 Starting services (Development mode with hot reload)...
docker-compose -f docker-compose.dev.yml up

REM Note: Not using -d flag so you can see logs in real-time

echo.
echo 📊 Service Status:
docker-compose -f docker-compose.dev.yml ps

echo.
echo ✅ Development environment is running!
echo.
echo 🌐 Access the application:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo.
echo 💡 Hot reload is enabled - changes will reflect automatically!
echo.
echo 📋 To stop: Press Ctrl+C
echo.
pause
