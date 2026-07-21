# Nearby Locator - Deployment Guide

## Production Deployment using Docker
The repository provides production-ready Docker definitions.

1. **Build Configuration**:
    - `docker-compose.yml` mounts a Node.js API container (port 5000) and an Nginx container serving the built React static files (port 80).
2. **Pre-Requisites**:
    - External PostgreSQL server (with PostGIS installed).
    - External Redis cluster.
    - Set environment variables securely in host execution runtime.
3. **Execution**:
    ```bash
    ./start-docker.sh
    ```
    This builds the multi-stage frontend Dockerfile, copies `dist/` to Nginx alpine, and spins up the backend runtime.
4. **Health Checks**:
    Integrated Docker health checks will block traffic to backend until HTTP `/health` returns 200 OK.
