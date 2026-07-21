# Architecture Document

## Overview
Nearby Locator uses a decoupled Client-Server architecture. The frontend is a React SPA following Feature-Sliced Design, while the backend is an Express.js monolithic API implementing a Controller-Repository-Database layered pattern.

## System Components
1. **Frontend**: React 19 SPA, TailwindCSS, Zustand state management.
2. **API Gateway & Business Logic**: Node.js/Express handling auth, rate-limiting, geospatial querying.
3. **Database**: PostgreSQL with PostGIS extension for high-performance spatial queries.
4. **Cache/Telemetry**: Redis used for rate limiting and transient session data.

## Key Design Patterns
- **Repository Pattern**: Database interactions are abstracted into repositories (e.g., `SpotRepository`).
- **Feature-Sliced Design**: Frontend groups logic by domain features (e.g., `chat-discovery`).
- **Resiliency**: Transient database retry wrappers and comprehensive global error handling.
