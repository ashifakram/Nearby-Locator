@echo off
REM Nearby Locator - Docker Production Setup (Windows)
REM This runs the production version WITH Nginx (optimized)

echo 🚀 Starting Nearby Locator - PRODUCTION MODE
echo.
echo ℹ️  This setup includes:
echo    - Nginx web server
echo    - Optimized static files
echo    - Small image size (25MB)
echo    - Best for deployment
echo.
echo 💡 For development with hot reload, use: start-docker-dev.bat
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

REM Check if GOOGLE_API_KEY is set
findstr /C:"your_google_api_key_here" .env >nul
if not errorlevel 1 (
    echo ⚠️  Warning: GOOGLE_API_KEY is not configured in .env file
    echo    The application may not work properly without a valid API key.
    echo.
    set /p continue="Continue anyway? (y/N): "
    if /i not "%continue%"=="y" exit /b 1
)

echo.
echo 🔨 Building Docker images...
docker-compose build

if errorlevel 1 (
    echo ❌ Build failed. Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo 🚀 Starting services...
docker-compose up -d

if errorlevel 1 (
    echo ❌ Failed to start services. Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo ⏳ Waiting for services to be healthy...
timeout /t 5 /nobreak >nul

REM Check service status
echo.
echo 📊 Service Status:
docker-compose ps

echo.
echo ✅ Application is running!
echo.
echo 🌐 Access the application:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo    Health:   http://localhost:5000/health
echo.
echo 📋 Useful commands:
echo    View logs:        docker-compose logs -f
echo    Stop services:    docker-compose down
echo    Restart services: docker-compose restart
echo.
pause
