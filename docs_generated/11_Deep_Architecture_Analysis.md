# Deep Architecture Analysis & Lineage

## 1. Frontend Dependency Graph

```mermaid
flowchart TD
    %% Entry Point
    Index[index.js] --> App[App.js]
    App --> Providers[app/providers.js]
    Providers --> Router[routes/index.js]

    %% Pages
    Router --> LandingPage[pages/landing/Landing.js]
    Router --> AuthPage[pages/auth/Login.js]
    Router --> SearchPage[pages/search/SearchPage.js]
    Router --> AdminPage[pages/admin/AdminDashboard.js]

    %% Features & Components
    SearchPage --> ChatDiscovery[features/chat-discovery/components/ChatInterface.js]
    ChatDiscovery --> MapCluster[components/Map/MapCluster.js]
    
    %% State Hooks & Store
    AuthPage --> AuthStore[store/authStore.js]
    SearchPage --> SearchHook[hooks/useDiscovery.js]
    AdminPage --> AdminHook[hooks/useAdmin.js]

    %% API Services
    AuthStore --> AuthService[services/auth.js]
    SearchHook --> SpotService[services/spots.js]
    AdminHook --> ApiService[services/api.js]

    %% Backend Gateway
    AuthService --> API_AUTH[(POST /api/auth)]
    SpotService --> API_SEARCH[(GET /api/discovery)]
    ApiService --> API_ADMIN[(GET /api/admin)]
```

---

## 2. Backend Dependency Graph

```mermaid
flowchart TD
    %% Express Root
    Server[index.js] --> Formatter[middleware/responseFormatter.js]
    Server --> Tracker[middleware/analyticsTracker.js]
    
    %% Routers
    Server --> AuthRoute[routes/authRoutes.js]
    Server --> DiscoveryRoute[routes/discoveryRoutes.js]
    Server --> AdminRoute[routes/adminRoutes.js]
    Server --> ModerationRoute[routes/moderationRoutes.js]

    %% Middleware Interceptors
    AuthRoute --> IPRateLimiter[middleware/rateLimiter.js]
    DiscoveryRoute --> GeoRateLimiter[middleware/geoRateLimiter.js]
    AdminRoute --> AuthJWT[middleware/authJwt.js]
    AdminRoute --> AdminCheck[middleware/adminCheck.js]

    %% Controllers
    AuthRoute --> AuthCtrl[controllers/authController.js]
    DiscoveryRoute --> DiscoveryCtrl[controllers/discoveryController.js]
    AdminRoute --> AdminCtrl[controllers/adminController.js]
    ModerationRoute --> ModCtrl[controllers/moderationController.js]

    %% Repositories
    AuthCtrl --> UserRepo[repositories/userRepository.js]
    DiscoveryCtrl --> SpotRepo[repositories/spotRepository.js]
    AdminCtrl --> UserRepo
    ModCtrl --> ModRepo[repositories/moderationRepository.js]

    %% Databases
    UserRepo --> DB_Users[(DB: users, sessions, attempts)]
    SpotRepo --> DB_Spots[(DB: spots, saves, clicks)]
    ModRepo --> DB_Mod[(DB: reports, appeals)]
```

---

## 3. Database Lineage (Read/Write Map)

This table maps out which backend controllers Read (R) or Write (W) to specific PostgreSQL tables.

| Table | Readers (R) | Writers (W) | Primary Purpose |
| :--- | :--- | :--- | :--- |
| `users` | AuthCtrl, UserCtrl, AdminCtrl | AuthCtrl, AdminCtrl | Core identity and profile data. |
| `login_attempts` | AuthCtrl (Brute-force check) | AuthCtrl | Security auditing and lockouts. |
| `user_sessions` | `authJwt` middleware | AuthCtrl | Stateful session token persistence. |
| `spots` | SpotCtrl, DiscoveryCtrl, AdminCtrl | SpotCtrl, AdminCtrl | Geospatial POI data (PostGIS coordinates). |
| `discovery_searches` | AdminCtrl (telemetry) | DiscoveryCtrl | Search analytics and trending data. |
| `discovery_clicks` | SpotRepo (ranking calculation) | DiscoveryCtrl | Engagement tracking for Spot score. |
| `discovery_saves` | SpotRepo (ranking calculation) | DiscoveryCtrl | High-intent engagement tracking. |
| `reports` | ModCtrl, AdminCtrl | ModCtrl | User-submitted flags for moderation. |
| `moderation_appeals` | AdminCtrl | ModCtrl | Disputes against moderation action. |
| `audit_logs` | AdminCtrl | AdminCtrl, ModCtrl | Immutable history of sensitive Admin actions. |
| `system_errors` | AdminCtrl | `errorHandler` middleware | Fatal unhandled exception logging. |

---

## 4. Request Lifecycle: Major Features

### A. Nearby Discovery Search
1. **Trigger**: User pans map or types query in Chat UI.
2. **Client**: `services/spots.js` sends `GET /api/discovery/search?lat=X&lng=Y&radius=Z&category=A`.
3. **Gateway**: `geoRateLimiter` permits request. `lenientAuthJwt` attaches User ID if logged in (for personalization) but allows guest access.
4. **Controller**: `discoveryController.js` validates bounds via Joi.
5. **Database Layer**: `SpotRepository.findNearby` constructs a **PostGIS CTE (Common Table Expression)**. It calculates a `composite_score` incorporating `ST_Distance()`, `freshness_score`, and joins against `discovery_clicks` for a `popularity_score`.
6. **Result**: An MMR (Maximal Marginal Relevance) diversified array of Spots is returned to the client.

### B. Authentication Lifecycle (Login)
1. **Trigger**: User submits login form.
2. **Client**: `authStore.js` dispatches `POST /api/auth/login`.
3. **Gateway**: `ipRateLimiter` restricts IP to 60 attempts/hour. `checkAccountLockout` reads Redis `bf:block:*` keys to block brute-forcers.
4. **Controller**: `authController.js` fetches user from `users` table. Checks bcrypt hash.
5. **Database Layer**: Writes to `login_attempts` (is_successful=true). Writes new row to `user_sessions`.
6. **Result**: Generates JWT token. Returns token & user object. React updates `AuthStore` and redirects to `/search`.

### C. Trust & Safety (Moderation Flagging)
1. **Trigger**: User flags a location as "Closed/Spam".
2. **Gateway**: `authJwt` requires active bearer token.
3. **Controller**: `moderationController.js` validates payload.
4. **Database Layer**: Writes a row to `reports` table linked to the `spot_id`.
5. **Admin Flow**: Admin dashboard queries `GET /api/moderation/admin/queue`.
6. **Admin Action**: Admin calls `POST /api/moderation/admin/spots/:id/action`. `adminController.js` updates `spots.moderation_status` to `'QUARANTINED'`. The `SpotRepository` search CTE automatically excludes `QUARANTINED` spots dynamically.

---

## 5. Architectural Mermaid Diagrams

### 5.1 System Architecture

```mermaid
graph TD
    User([End User]) -->|HTTPS / JSON| Nginx[Nginx Reverse Proxy\nDocker Frontend]
    Nginx --> React[React SPA\nZustand/Tailwind]
    React -->|REST API| Express[Express Node.js\nAPI Gateway]
    
    subgraph Backend Subsystem
    Express --> Redis[(Redis Cache)]
    Redis -->|Rate Limits & Telemetry| Express
    Express --> Repositories[Knex Data Access Layer]
    Repositories --> PostGIS[(PostgreSQL + PostGIS)]
    end
    
    subgraph External
    Express -.->|Geocoding Fallback| Google[Google Places API]
    end
```

### 5.2 Authentication & Brute-Force Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant Redis
    participant Postgres
    
    Client->>API: POST /api/auth/login
    API->>Redis: Check bf:block:{email}
    alt Account is Blocked
        Redis-->>API: 1 (Blocked)
        API-->>Client: 429 Too Many Requests
    else Account is Clear
        API->>Postgres: SELECT * FROM users WHERE email=?
        Postgres-->>API: User Row
        API->>API: Bcrypt Compare
        alt Invalid Password
            API->>Redis: INCR bf:attempts:{email}:{ip}
            API->>Postgres: INSERT login_attempts (failure)
            API-->>Client: 401 Unauthorized
        else Valid Password
            API->>Postgres: INSERT user_sessions
            API->>Postgres: INSERT login_attempts (success)
            API->>API: Sign JWT
            API-->>Client: 200 OK + Token
        end
    end
```

### 5.3 Advanced Spatial Search Flow

```mermaid
stateDiagram-v2
    [*] --> RequestReceived
    RequestReceived --> ValidateSchema : Joi Parsing
    ValidateSchema --> PostGIS_CTE : SpotRepository.findNearby()
    
    state PostGIS_CTE {
        RadiusFilter : ST_DWithin(radius)
        ActivityFilter : Exclude QUARANTINED
        ScoreGeneration : composite_score = (Distance * Popularity * Freshness)
        MMR_Rerank : Apply Category Diversity Penalty
        
        RadiusFilter --> ActivityFilter
        ActivityFilter --> ScoreGeneration
        ScoreGeneration --> MMR_Rerank
    }
    
    PostGIS_CTE --> FormatResponse
    FormatResponse --> [*]
```

### 5.4 Docker Deployment Topology

```mermaid
graph LR
    subgraph Host / Cloud Server
        subgraph Frontend Container
            NGINX[Nginx Server :80]
            STATIC[Built React Files]
            NGINX --> STATIC
        end
        
        subgraph Backend Container
            NODE[Node.js Express :5000]
        end
        
        subgraph Database Container
            PG[PostgreSQL 17 :5432]
            POSTGIS[PostGIS Extension]
            PG --- POSTGIS
        end
        
        subgraph Cache Container
            RED[Redis :6379]
        end
        
        NGINX -->|/api/* proxy_pass| NODE
        NODE -->|Knex TCP| PG
        NODE -->|ioredis TCP| RED
    end
    
    Internet((Internet)) -->|Port 3000| NGINX
```
