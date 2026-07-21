# Nearby Locator - Environment Setup Guide

## Requirements
- Node.js 18+
- PostgreSQL 17 with PostGIS extension installed.
- Redis server running.

## Local Setup
1. **Clone Repo**.
2. **Database Setup**: Create PostgreSQL DB `nearby_locator`. Enable postgis (`CREATE EXTENSION postgis;`).
3. **Backend Environment**:
    Create `backend/.env` with:
    ```
    DATABASE_URL=postgresql://user:pass@localhost:5432/nearby_locator
    REDIS_URL=redis://localhost:6379
    JWT_SECRET=your_secret_key
    ```
4. **Run Migrations**:
    ```bash
    cd backend
    npm install
    npm run migrate
    ```
5. **Start Backend**: `npm start`
6. **Frontend Environment**:
    Create `frontend/.env.development` with:
    ```
    VITE_BACKEND_URL=http://localhost:5000
    ```
7. **Start Frontend**: `npm install && npm run dev`
