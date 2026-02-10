# 🌍 Nearby Locator

An intelligent location-based search application with Smart chat interface that helps users discover nearby places like restaurants, hospitals, ATMs, and more.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-19.2.0-61dafb)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ed)

---

## ✨ Features

### 🤖 Smart Chat Interface
- Natural language processing for location queries
- Conversational interface with typing indicators
- Smart parsing of categories and search radius
- Context-aware responses with helpful suggestions

### 📍 Location-Based Search
- Real-time geolocation using browser API
- Support for 10+ place categories
- Customizable search radius (2-20 km)
- Google Places API integration

### 🎨 Modern UI/UX
- Interactive 3D background with Three.js
- Glassmorphism design with dark theme
- Responsive layout for mobile and desktop
- Smooth animations and transitions
- User-friendly error messages

### 🗺️ Interactive Results
- Clickable map links for each place
- Direct Google Maps navigation
- Place ratings and addresses
- Opens in new tab or Google Maps app

---

## 🚀 Quick Start

### Option 1: Run Without Docker (Fastest)

**Prerequisites:**
- Node.js 18+ installed
- Google Places API key

**Steps:**
```bash
# 1. Clone the repository
git clone <repository-url>
cd nearby-locator

# 2. Setup Backend
cd backend
npm install
# Create .env file and add: GOOGLE_API_KEY=your_key_here
node index.js

# 3. Setup Frontend (in new terminal)
cd frontend
npm install
npm start
```

**Access:** http://localhost:3000

---

### Option 2: Run With Docker (Production)

**Prerequisites:**
- Docker and Docker Compose installed
- Google Places API key

**Steps:**
```bash
# 1. Clone the repository
git clone <repository-url>
cd nearby-locator

# 2. Create .env file
cp .env.example .env
# Edit .env and add: GOOGLE_API_KEY=your_key_here

# 3. Run with Docker
# Windows:
start-docker.bat

# Linux/Mac:
chmod +x start-docker.sh
./start-docker.sh
```

**Access:** http://localhost:3000

---

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Technology Stack](#-technology-stack)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Docker Setup](#-docker-setup)
- [Development](#-development)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 📁 Project Structure

```
nearby-locator-Smart Search/
├── backend/                    # Node.js Express API
│   ├── index.js               # Main server file
│   ├── config.js              # Configuration
│   ├── package.json           # Dependencies
│   ├── Dockerfile             # Docker configuration
│   └── .env                   # Environment variables (not in git)
│
├── frontend/                   # React application
│   ├── src/
│   │   ├── App.js             # Main React component
│   │   ├── components/        # React components
│   │   │   └── GridScan.jsx   # 3D background animation
│   │   ├── icons/             # SVG icon components
│   │   └── index.js           # Entry point
│   ├── public/                # Static assets
│   ├── package.json           # Dependencies
│   ├── Dockerfile             # Production Docker (with Nginx)
│   ├── Dockerfile.dev         # Development Docker (no Nginx)
│   └── nginx.conf             # Nginx configuration
│
├── docker-compose.yml         # Production Docker setup
├── docker-compose.dev.yml     # Development Docker setup
├── .env.example               # Environment template
├── start-docker.bat           # Windows production start script
├── start-docker.sh            # Linux/Mac production start script
├── start-docker-dev.bat       # Windows development start script
├── start-docker-dev.sh        # Linux/Mac development start script
└── README.md                  # This file
```

---

## 🛠️ Technology Stack

### Frontend
- **React 19.2.0** - UI framework
- **Three.js** - 3D graphics and animations
- **Tailwind CSS** - Utility-first styling
- **face-api.js** - Optional face tracking
- **PostProcessing** - Visual effects (bloom, chromatic aberration)

### Backend
- **Node.js 18+** - Runtime environment
- **Express.js** - Web framework
- **Axios** - HTTP client
- **CORS** - Cross-origin resource sharing
- **Google Places API** - Location data

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Production web server

---

## ⚙️ Configuration

### Backend Configuration

**File:** `backend/.env`

```env
GOOGLE_API_KEY=your_google_api_key_here
```

**Get Google API Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Places API"
4. Create credentials (API Key)
5. Copy key to `.env` file

### Frontend Configuration

**File:** `frontend/.env.production`

```env
REACT_APP_BACKEND_URL=http://localhost:5000
```

**For production deployment, update to your backend URL:**
```env
REACT_APP_BACKEND_URL=https://api.yourdomain.com
```

---

## 📡 API Documentation

### Backend Endpoints

#### POST /nearby
Find nearby places based on location and category.

**Request:**
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "category": "restaurant",
  "radius": 2
}
```

**Response:**
```json
{
  "status": "success",
  "results": [
    {
      "name": "Pizza Palace",
      "address": "123 Main Street",
      "rating": 4.5,
      "map_url": "https://www.google.com/maps/dir/?api=1&origin=..."
    }
  ]
}
```

**Error Response:**
```json
{
  "status": "error",
  "message": "User-friendly error message"
}
```

#### GET /health
Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Supported Categories

- `restaurant` - Restaurants
- `hospital` - Hospitals
- `pharmacy` - Pharmacies
- `atm` - ATMs
- `gas_station` - Gas Stations
- `school` - Schools
- `shopping_mall` - Shopping Malls
- `bank` - Banks
- `cafe` - Cafes
- `lodging` - Hotels

---

## 🐳 Docker Setup

### Production Setup (with Nginx)

**Optimized for deployment:**
- Small image size (25MB frontend)
- Nginx web server
- Static file caching
- Gzip compression

```bash
# Windows
start-docker.bat

# Linux/Mac
./start-docker.sh

# Or manually
docker-compose up --build
```

### Development Setup (without Nginx)

**Optimized for development:**
- Hot reload enabled
- React dev server
- Volume mounting
- Easy debugging

```bash
# Windows
start-docker-dev.bat

# Linux/Mac
./start-docker-dev.sh

# Or manually
docker-compose -f docker-compose.dev.yml up --build
```

**See:** `DOCKER_SCRIPTS_GUIDE.md` for detailed explanation

---

## 💻 Development

### Local Development (No Docker)

**Backend:**
```bash
cd backend
npm install
node index.js
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

### Development with Docker

```bash
docker-compose -f docker-compose.dev.yml up
```

### Making Changes

**Frontend changes:**
- Edit files in `frontend/src/`
- Changes reflect automatically with hot reload

**Backend changes:**
- Edit files in `backend/`
- Restart server: `Ctrl+C` then `node index.js`
- Or use nodemon: `npm install -g nodemon` then `nodemon index.js`

### Testing

**Frontend:**
```bash
cd frontend
npm test
```

**Backend:**
```bash
cd backend
# Add your tests
npm test
```

---

## 🚀 Deployment

### Deploy with Docker

**1. Build production images:**
```bash
docker-compose build
```

**2. Tag images:**
```bash
docker tag nearby-locator-backend:latest your-registry/backend:v1.0
docker tag nearby-locator-frontend:latest your-registry/frontend:v1.0
```

**3. Push to registry:**
```bash
docker push your-registry/backend:v1.0
docker push your-registry/frontend:v1.0
```

### Deploy to Cloud Platforms

**Vercel (Frontend):**
```bash
cd frontend
vercel deploy
```

**Render (Backend):**
- Connect GitHub repository
- Set environment variables
- Deploy

**AWS ECS / Google Cloud Run / Azure:**
- Use Docker images
- Configure environment variables
- Set up load balancer
- Enable HTTPS

---

## 🐛 Troubleshooting

### Common Issues

#### "Location service unavailable"
**Cause:** Invalid or missing Google API key

**Solution:**
1. Check `backend/.env` has valid `GOOGLE_API_KEY`
2. Verify Places API is enabled in Google Cloud Console
3. Restart backend server

#### "Can't find any places"
**Cause:** No results in the area or API error

**Solution:**
1. Try increasing search radius
2. Try different category
3. Check backend logs: `docker-compose logs backend`

#### Port already in use
**Cause:** Another service using port 3000 or 5000

**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
# Kill the process

# Linux/Mac
lsof -i :3000
kill -9 <PID>
```

#### Docker build fails
**Cause:** Missing dependencies or network issues

**Solution:**
```bash
# Clean rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

### Getting Help

1. Check logs: `docker-compose logs -f`
2. Verify environment: `cat .env`
3. Check service health: `curl http://localhost:5000/health`
4. Review documentation in `/docs` folder

---

## 📚 Documentation

- **[START_HERE.md](START_HERE.md)** - Simple getting started guide
- **[DOCKER_SCRIPTS_GUIDE.md](DOCKER_SCRIPTS_GUIDE.md)** - Docker scripts explained
- **[README_DOCKER.md](README_DOCKER.md)** - Complete Docker guide
- **[DOCKER_SETUP.md](DOCKER_SETUP.md)** - Detailed Docker setup
- **[WHICH_DOCKER_SETUP.md](WHICH_DOCKER_SETUP.md)** - Choosing Docker setup
- **[ERROR_HANDLING_GUIDE.md](ERROR_HANDLING_GUIDE.md)** - Error messages guide
- **[RESPONSE_PREVIEW.md](RESPONSE_PREVIEW.md)** - UI response preview

---

## 🎨 Features in Detail

### 3D Background Animation
- WebGL-powered grid visualization
- Mouse tracking with smooth damping
- Optional face tracking using face-api.js
- Configurable scan animations
- Post-processing effects (bloom, chromatic aberration)

### Chat Interface
- Natural language understanding
- Typing indicators
- Message timestamps
- User and bot avatars
- Quick action buttons
- Distance selector
- Location permission handling

### Search Results
- Place cards with details
- Star ratings
- Clickable map links
- Google Maps integration
- Responsive design

---

## 🔒 Security

- Environment variables for sensitive data
- CORS configuration
- Security headers (Nginx)
- Input validation
- Error message sanitization
- No sensitive data in logs

---

## 📈 Performance

### Frontend
- Code splitting
- Lazy loading
- Image optimization
- Gzip compression (production)
- Static asset caching (production)

### Backend
- Efficient API calls
- Error handling
- Health checks
- Logging

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👥 Authors

- Your Name - Initial work

---

## 🙏 Acknowledgments

- Google Places API for location data
- Three.js for 3D graphics
- React team for the framework
- Tailwind CSS for styling
- Docker for containerization

---

## 📞 Support

For support, email support@example.com or open an issue on GitHub.

---

## 🗺️ Roadmap

- [ ] Add more place categories
- [ ] Implement user favorites
- [ ] Add place reviews
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Offline mode
- [ ] Advanced filters
- [ ] Social sharing

---

## 📊 Stats

- **Lines of Code:** ~3,000+
- **Components:** 10+
- **API Endpoints:** 2
- **Docker Images:** 2
- **Supported Categories:** 10+

---

**Made with ❤️ using React, Node.js, and Docker**

---

## 🎯 Quick Links

- [Getting Started](#-quick-start)
- [Docker Setup](#-docker-setup)
- [API Docs](#-api-documentation)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

**⭐ If you find this project useful, please give it a star!**
