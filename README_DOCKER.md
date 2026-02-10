# 🐳 Nearby Locator - Docker Edition

Run the complete Nearby Locator application with a single command using Docker!

---

## ⚡ Quick Start (3 Steps)

### 1. Install Docker
Download and install Docker Desktop:
- **Windows/Mac**: [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux**: [Docker Engine](https://docs.docker.com/engine/install/)

### 2. Configure API Key
```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your Google API key
# GOOGLE_API_KEY=your_actual_google_api_key_here
```

### 3. Run the Application

**Windows:**
```cmd
start-docker.bat
```

**Linux/Mac:**
```bash
chmod +x start-docker.sh
./start-docker.sh
```

**Or manually:**
```bash
docker-compose up --build
```

---

## 🌐 Access the Application

Once running:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

---

## 📦 What's Included

### Backend Container
- **Image**: Node.js 18 Alpine
- **Port**: 5000
- **Features**:
  - Express API server
  - Google Places API integration
  - Health check endpoint
  - Auto-restart on failure
  - Optimized production build

### Frontend Container
- **Image**: Nginx Alpine
- **Port**: 3000 (mapped from 80)
- **Features**:
  - React 19 application
  - Nginx web server
  - Gzip compression
  - Static asset caching
  - Health check endpoint
  - Auto-restart on failure

### Docker Compose
- **Network**: Isolated bridge network
- **Health Checks**: Automatic service monitoring
- **Dependencies**: Frontend waits for backend
- **Logging**: JSON file logging with rotation

---

## 🛠️ Common Commands

### Start Services
```bash
# Start in foreground (see logs)
docker-compose up

# Start in background
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific
docker-compose restart backend
```

### Rebuild After Changes
```bash
docker-compose up --build
```

### Check Status
```bash
docker-compose ps
```

---

## 📁 Docker Files

```
nearby-locator-Smart Search/
├── docker-compose.yml          # Orchestrates both services
├── .env                        # Environment variables (not in git)
├── .env.example                # Environment template
├── start-docker.sh             # Quick start script (Linux/Mac)
├── start-docker.bat            # Quick start script (Windows)
├── backend/
│   ├── Dockerfile              # Backend container definition
│   └── .dockerignore           # Files to exclude
└── frontend/
    ├── Dockerfile              # Frontend container definition
    ├── nginx.conf              # Nginx configuration
    └── .dockerignore           # Files to exclude
```

---

## 🔧 Configuration

### Environment Variables

**Root `.env` file:**
```env
GOOGLE_API_KEY=your_google_api_key_here
```

**Frontend `.env.production`:**
```env
REACT_APP_BACKEND_URL=http://localhost:5000
```

### Port Configuration

Change ports in `docker-compose.yml`:
```yaml
services:
  backend:
    ports:
      - "5000:5000"  # Change first number for host port
  
  frontend:
    ports:
      - "3000:80"    # Change first number for host port
```

---

## 🐛 Troubleshooting

### Backend Not Starting

**Check logs:**
```bash
docker-compose logs backend
```

**Common issues:**
- Missing or invalid `GOOGLE_API_KEY`
- Port 5000 already in use
- Network connectivity issues

**Solution:**
```bash
# Stop and restart
docker-compose down
docker-compose up --build
```

### Frontend Can't Connect to Backend

**Check backend health:**
```bash
curl http://localhost:5000/health
```

**Check network:**
```bash
docker network inspect nearby-locator-network
```

**Solution:**
```bash
docker-compose restart
```

### Port Already in Use

**Error**: `Bind for 0.0.0.0:3000 failed`

**Find process:**
```bash
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000
```

**Solution:**
- Kill the process using the port
- Or change port in `docker-compose.yml`

### Changes Not Reflected

**Solution:**
```bash
# Rebuild without cache
docker-compose build --no-cache
docker-compose up
```

---

## 🧪 Testing

### Test Backend Health
```bash
curl http://localhost:5000/health
```

**Expected:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Test Backend API
```bash
curl -X POST http://localhost:5000/nearby \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 28.6139,
    "longitude": 77.2090,
    "category": "restaurant",
    "radius": 2
  }'
```

### Test Frontend
Open browser: http://localhost:3000

---

## 🚀 Production Deployment

### Build Production Images
```bash
docker-compose build
```

### Tag Images
```bash
docker tag nearby-locator-backend:latest your-registry/backend:v1.0
docker tag nearby-locator-frontend:latest your-registry/frontend:v1.0
```

### Push to Registry
```bash
docker push your-registry/backend:v1.0
docker push your-registry/frontend:v1.0
```

### Deploy to Cloud

**AWS ECS:**
- Create task definitions
- Configure service
- Set environment variables
- Enable load balancer

**Google Cloud Run:**
```bash
gcloud run deploy backend --image your-registry/backend:v1.0
gcloud run deploy frontend --image your-registry/frontend:v1.0
```

**Azure Container Instances:**
```bash
az container create --resource-group mygroup \
  --name backend --image your-registry/backend:v1.0
```

---

## 📊 Monitoring

### View Resource Usage
```bash
docker stats
```

### View Container Details
```bash
docker inspect nearby-locator-backend
docker inspect nearby-locator-frontend
```

### Export Logs
```bash
docker-compose logs > application.log
```

---

## 🧹 Cleanup

### Stop and Remove Containers
```bash
docker-compose down
```

### Remove Images
```bash
docker rmi nearby-locator-backend nearby-locator-frontend
```

### Remove Everything
```bash
docker-compose down -v --rmi all
docker system prune -a
```

---

## 🔒 Security Best Practices

1. **Never commit `.env` files** - Already in `.gitignore`
2. **Use secrets management** - For production deployments
3. **Update base images** - Regularly update Node.js and Nginx
4. **Scan for vulnerabilities** - Use `docker scan`
5. **Limit container resources** - Add resource limits in docker-compose
6. **Use non-root users** - Already implemented in Dockerfiles
7. **Enable HTTPS** - Use reverse proxy (Nginx/Traefik) in production

---

## 📈 Performance Optimization

### Multi-stage Builds
Both Dockerfiles use multi-stage builds to minimize image size:
- Frontend: Build stage (Node) → Serve stage (Nginx)
- Backend: Production dependencies only

### Image Sizes
- Backend: ~150MB (Alpine-based)
- Frontend: ~25MB (Nginx Alpine + static files)

### Caching
- Docker layer caching enabled
- Nginx static asset caching configured
- Gzip compression enabled

---

## 🆘 Support

### Check Service Health
```bash
docker-compose ps
```

### View All Logs
```bash
docker-compose logs
```

### Restart Everything
```bash
docker-compose restart
```

### Complete Reset
```bash
docker-compose down -v
docker-compose up --build
```

---

## ✅ Pre-flight Checklist

Before running:
- [ ] Docker installed and running
- [ ] Docker Compose installed
- [ ] `.env` file created with valid `GOOGLE_API_KEY`
- [ ] Ports 3000 and 5000 available
- [ ] Google Places API enabled in GCP
- [ ] Internet connection available

After running:
- [ ] Backend health check passes
- [ ] Frontend loads successfully
- [ ] Location permission granted
- [ ] Search returns results
- [ ] Map links work correctly

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Google Places API](https://developers.google.com/maps/documentation/places/web-service)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

## 🎉 Success!

Your Nearby Locator application is now running in Docker containers!

**Next Steps:**
1. Open http://localhost:3000
2. Grant location permission
3. Search for nearby places
4. Click "Map" buttons to get directions

Enjoy! 🚀
