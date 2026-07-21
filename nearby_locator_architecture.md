# Nearby Locator System Architecture Blueprint

This document serves as the absolute "Source of Truth" for the **Nearby Locator** application. It describes the High-Level Design (HLD), Low-Level Design (LLD), Tech Stack, Database Schemas, Data Flows, and Module-by-Module API specifications. Any AI developer agent or system engineer can ingest this document to immediately understand the system structure, design patterns, and operational procedures to safely build new features or optimize performance.

---

## 📖 1. Project Overview & Business Value

The **Nearby Locator** is a sleek, location-aware assistant that enables users to discover points of interest (restaurants, hospitals, pharmacies, ATMs, gas stations, etc.) near their current coordinates using a futuristic, glassmorphic conversational chat UI.

### Key Value Pillars
*   **Conversational Search Engine**: Instead of filling out rigid search forms, users type queries naturally (e.g., *"Find resturants within 5 km"*).
*   **Fuzzy NLP Engine**: A built-in typo-tolerant search parsing mechanism with multi-language capability (English, Spanish, French, and Hindi/Hinglish).
*   **Secured Profile Management**: Local credential-based accounts and mock Google OAuth account merging/delinking with state-of-the-art brute-force security.
*   **Telemetric Analytics Dashboard**: Real-time traffic, session counts, and system anomaly logging available to admin roles.
*   **Micro-Interaction Premium UI**: Fast, responsive client using floating glass cards, custom vector icons, and smooth CSS animations.

---

## 🛠️ 2. Comprehensive Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Core** | React | `19.2.0` | Declarative UI framework |
| **Frontend Styling** | TailwindCSS | `3.4.17` | Utility-first styling framework |
| **Frontend Routing** | React Router DOM | `6.x (lazy)` | Client-side routing and layout rendering |
| **Data Visualization**| Recharts | `latest` | High-fidelity admin telemetry charts |
| **Backend Framework** | Express.js | `4.18.2` | Fast, minimalist web framework for Node.js |
| **API Module Style** | ES Modules | `ES2022` | Modern JS importing (`import`/`export`) |
| **Relational Database**| PostgreSQL | `17.x` | Audit logging, credentials, error reporting |
| **Database Query/ORM**| Knex.js | `2.5.1` | SQL query builder and schema migration runner |
| **Database Adapter** | pg (node-postgres)| `8.11.3` | Non-blocking PostgreSQL client driver |
| **Cache & Telemetry** | Redis | `4.6.7` | Sessions caching, geo-traffic telemetry, brute-force logs |
| **Cryptography** | bcrypt | `5.1.1` | Blowfish crypt password hashing (12 salt rounds) |
| **Token Verification**| JSON Web Tokens | `9.0.2` | Stateless bearer token authentication |
| **Validation Engine** | Joi | `17.9.2` | Request body validation |
| **Test Runners** | Jest & Supertest | `29.0.0` | Comprehensive unit/integration API tests |
| **External API** | Google Places API | `v1` | Context-aware local search retrieval |

---

## 📐 3. High-Level Design (HLD)

### 3.1. Architectural Pattern
The Nearby Locator utilizes a decoupled **Client-Server Architecture** communicating over a stateless JSON REST API. 

```mermaid
graph TD
    User([🌐 End User Client]) <-->|HTTPS / JSON API| FE[💻 React Single Page App]
    FE <-->|REST Request / JWT| BE[⚙️ Express API Gateway]
    BE <-->|Nearby Place Search| GooglePlaces[🗺️ Google Places API]
    BE <-->|Read / Write SQL| DB[(🛢️ PostgreSQL Database)]
    BE <-->|Cache Telemetry & Attempts| RedisCache[(⚡ Redis Cache)]
```

### 3.2. Containerized Deployment Architecture
The platform is designed to be fully containerized. A multi-container Docker composition sets up an isolated virtual network with standard bridge-interfaces to keep database credentials protected from external exposure.

*   **Production Environment (`docker-compose.yml`)**: Builds backend on Express port `5000` with strict health check rules, and mounts the frontend on port `3000` with an Nginx reverse-proxy overlay.
*   **Development Environment (`docker-compose.dev.yml`)**: Builds hot-reloaded development containers linking local directories. It exposes standard hot-reload websockets using the Chokidar polling adapter.

---

## 📁 4. Low-Level Design (LLD)

### 4.1. File System Structure & Mapping

```
nearby-locator/
├── frontend/                       # React client-side application
│   ├── public/                     # Static elements (index.html, manifest)
│   ├── src/                        # React source components
│   │   ├── components/             # Reusable UI components
│   │   │   ├── Navbar.jsx          # Island-style floating navigation
│   │   │   ├── Footer.jsx          # Glass footer with uptime statistics
│   │   │   └── QuantumLoader.jsx   # CSS tech-ring spinning loading widget
│   │   ├── icons/                  # Customized SVG React component wrappers
│   │   │   ├── LocationIcon.jsx    # Primary map pins
│   │   │   ├── LoaderIcon.jsx      # Spinner asset
│   │   │   └── BellIcon.jsx        # Notification alert indicator
│   │   ├── views/                  # Page-level route views
│   │   │   ├── LandingPage.jsx     # Cyberpunk-themed home screen
│   │   │   ├── AboutUs.jsx         # Mission control stack overview
│   │   │   ├── Login.jsx           # Account login placeholder view
│   │   │   ├── Dashboard.jsx       # Chat UI mount (exports App.js)
│   │   │   └── AdminAnalytics.jsx  # Recharts telemetry graphs page
│   │   ├── App.js                  # Main chat workflow, state & NLP parser
│   │   ├── index.js                # React root config, lazy route manager
│   │   └── index.css               # Tailwind standard styles
│   └── package.json                # Frontend manifests
│
├── backend/                        # Node.js/Express service
│   ├── config.js                   # Environment variables loader
│   ├── db.js                       # Knex relational PostgreSQL adapter
│   ├── redisClient.js              # Redis cluster connector
│   ├── index.js                    # Server core, places, and lists routers
│   ├── migrate.js                  # Programmatic knex migration runner
│   ├── controllers/                # Business logic request handlers
│   │   ├── authController.js       # Signup, signin, Google OAuth, delinker
│   │   ├── userController.js       # Profile, GDPR deletion routines
│   │   └── analyticsController.js  # Telemetry aggregates compiler
│   ├── middleware/                 # Interceptors & filters
│   │   ├── adminCheck.js           # Role/email validation filter
│   │   ├── analyticsTracker.js     # Redis session logging interceptor
│   │   ├── authJwt.js              # Bearer signature decryptor
│   │   ├── bruteForceProtection.js # Redis-based failed login rate limiter
│   │   ├── errorHandler.js         # Global error logger to Postgres DB
│   │   └── responseFormatter.js    # Strict standardized response helper
│   ├── migrations/                 # Knex relational DB table migrations
│   │   ├── 20241001_create_users.js
│   │   ├── 20241002_create_login_attempts.js
│   │   ├── 20241003_create_system_errors.js
│   │   └── 20241004_create_user_sessions.js
│   └── package.json                # Backend manifests
```

---

## 🗄️ 5. Database Schema & Caching Design

### 5.1. PostgreSQL Schema
The relational structure relies on UUID primary keys generated using `gen_random_uuid()` at the engine level. 

```mermaid
erDiagram
    users {
        uuid id PK
        string email UK
        string password_hash
        string name
        string avatar_url
        enu provider "['local', 'google']"
        string google_id UK
        enu status "['active', 'disabled']"
        timestamp created_at
        timestamp updated_at
        uuid created_by
        uuid updated_by
    }
    user_sessions {
        uuid id PK
        uuid user_id FK
        string session_token
        timestamp expires_at
        timestamp created_at
        timestamp updated_at
    }
    login_attempts {
        uuid id PK
        string email
        string ip_address
        string country
        boolean is_successful
        string failure_reason
        timestamp attempted_at
    }
    system_errors {
        uuid id PK
        text error_message
        text stack_trace
        timestamp occurred_at
    }

    users ||--o{ user_sessions : "has"
```

#### Detailed Columns Specifications
1.  **`users`**:
    *   `id`: Primary key. Typology: `uuid`. Default: `gen_random_uuid()`.
    *   `email`: String. Must be unique, non-null.
    *   `password_hash`: String. Nullable (allows local bypass for Google OAuth accounts).
    *   `provider`: Enum `['local', 'google']`. Defaults to `'local'`.
    *   `status`: Enum `['active', 'disabled']`. Defaults to `'active'`.
2.  **`login_attempts`**:
    *   Tracks all login events to enable compliance logs and security analytics.
    *   Records Client IP, Geo-IP resolved Country, Success/Failure status, and `failure_reason`.
3.  **`system_errors`**:
    *   Central log of unhandled server failures. Retains standard stacks for developers.
4.  **`user_sessions`**:
    *   Stores active session identifiers and validation expiry timestamps.

### 5.2. Redis Caching & Telemetry Keys Layout
Redis is leveraged to process volatile session telemetry, rate-limiting, and credentials blocking.

*   **Brute-Force Limiters**: 
    *   Key: `bf:attempts:${email}:${ip}` 
    *   Type: Integer (counter)
    *   Sliding Window: `900` seconds (15 mins). If > 5, writes block key.
*   **Brute-Force Blocks**:
    *   Key: `bf:block:${email}`
    *   Type: String (`'1'`)
    *   Expiration: `1800` seconds (30 mins).
*   **Volatile Telemetry Sessions**:
    *   Key: `session:${sessionId}`
    *   Type: JSON String (`{ ip, country, path, method, lastSeen }`)
    *   Expiration: `300` seconds (5 mins). Extends automatically on new actions (sliding TTL).

---

## 🧠 6. Natural Language Processing (NLP) Parser Engine

Query processing happens on the React client side in [App.js](file:///f:/New%20folder%20(6)/nearby-locator/frontend/src/App.js#L472-L661).

### 6.1. Fuzzy Levenshtein Distance Typo Tolerance
To prevent failed searches from standard human misspellings, queries are processed via a fuzzy evaluator that measures the minimum single-character edit operations (insertions, deletions, substitutions) required to transform one string into another.

```javascript
fuzzyMatch(str1, str2, threshold = 2)
```
*   **Execution flow**:
    1. Lowercase both arguments.
    2. Exact equality evaluation (`s1 === s2`).
    3. Standard substring validation (`s1.includes(s2) || s2.includes(s1)`).
    4. Compute edit cost matrix. If total cost $\le 2$, a positive match is returned.

### 6.2. Mapping Categories & Multilingual Synonyms
The parser translates human queries into the standard target category type required by the Google Places API. The search dictionary covers **10 main categories** containing **150+ multilingual keywords**:

*   **`restaurant`**: `restaurant`, `restaurants`, `food`, `eat`, `bistro`, `eatery`, `pizzeria`, `burger`, `khana` (Hindi), `comida` (Spanish), `nourriture` (French).
*   **`hospital`**: `hospital`, `clinic`, `emergency`, `doctor`, `dawakhana` (Hindi), `clínica` (Spanish), `hôpital` (French).
*   **`pharmacy`**: `pharmacy`, `medicine`, `chemist`, `drugstore`, `medical shop` (Hinglish), `farmacia` (Spanish), `pharmacie` (French).
*   **`gas_station`**: `gas station`, `petrol`, `fuel`, `petrol pump` (Hinglish), `gasolinera` (Spanish), `station-service` (French).
*   **`atm`**: `atm`, `cash`, `money`, `paisa` (Hindi), `cajero` (Spanish), `distributeur` (French).
*   **`school`**: `school`, `college`, `university`, `vidyalaya` (Hindi), `escuela` (Spanish), `école` (French).
*   **`shopping_mall`**: `mall`, `shopping center`, `plaza`, `bazaar` (Hindi), `centro comercial` (Spanish), `centre commercial` (French).
*   **`bank`**: `bank`, `banking`, `banco` (Spanish), `banque` (French).
*   **`cafe`**: `cafe`, `coffee`, `tea`, `chai` (Hindi), `cafetería` (Spanish), `café` (French).
*   **`lodging`**: `hotel`, `motel`, `inn`, `resort`, `accommodation`, `guesthouse`, `alojamiento` (Spanish), `hôtel` (French).

### 6.3. Radius Parser & Range Guardrails
The radius extraction scanner utilizes regular expressions to intercept the search range:
1.  **Regex Matching Patterns**:
    *   `/(\d+(?:\.\d+)?)\s*(?:km|kms|kilometer|kilometers|k)\b/i` (e.g. *"5 km"*, *"2.5k"*)
    *   `/within\s+(\d+(?:\.\d+)?)/i` (e.g. *"within 5"*)
    *   `/around\s+(\d+(?:\.\d+)?)/i` (e.g. *"around 3"*)
2.  **Smart Standalone Scanner**: If no suffix is matched, but a raw integer between `2` and `20` exists, the parser implicitly assigns it as kilometers.
3.  **Range Guardrail**: Only searches between **2 km** and **20 km** are permitted to prevent out-of-memory or excessive payload API timeouts.

---

## 🌊 7. Data Flow & Request Lifecycles

### 7.1. Context Data Flow Diagram (DFD Level 0)
```
[User Browser] ====(1) Raw Query / Geolocation====> [Chat UI app]
[Chat UI app]  ====(2) Coordinates & Category ====> [Express API]
[Express API]  ====(3) API Key & Lat,Lng,Rad  ====> [Google Places API]
[Express API]  <===(4) Places JSON Array      ====  [Google Places API]
[Chat UI app]  <===(5) Structured Place Cards ====  [Express API]
```

### 7.2. Global Backend Request-Response Middleware Lifecycle
When a client sends a request to any protected route (like fetching profiles or analytical dashboard items), the request undergoes sequential middleware layers:

```mermaid
flowchart TD
    Req([HTTP Request]) --> Formatter[Response Formatter Middleware]
    Formatter --> Tracker[Analytics Telemetry Tracker Middleware]
    Tracker --> RateLimit{Brute Force / Rate Limit Check}
    RateLimit -->|Exceeded / Locked| Resp429([Send standard 429 JSON Error])
    RateLimit -->|Pass| AuthCheck{Is Protected Route?}
    AuthCheck -->|No| Controller[Execute Controller Handler]
    AuthCheck -->|Yes| JWTAuth{Verify Bearer JWT Signature}
    JWTAuth -->|Invalid / Expired| Resp410([Send standard 401 JSON Error])
    JWTAuth -->|Valid| AdminFilter{Requires Admin?}
    AdminFilter -->|No| Controller
    AdminFilter -->|Yes| AdminCheck{User Email = admin@locator.com or Role = admin?}
    AdminCheck -->|No| Resp403([Send standard 403 Forbidden Error])
    AdminCheck -->|Yes| Controller
    Controller -->|Unhandle Error / Crash| ErrorCatch[Global Error Handler]
    ErrorCatch --> PostgresLog[Log error stack to system_errors DB table]
    PostgresLog --> Resp500([Send standard 500 JSON Error])
```

---

## 🔌 8. API Specifications (Module-Wise)

Every endpoint returns a strict JSON envelope matching the following structure:
```json
{
  "success": true,
  "status": 200,
  "message": "Retrieval feedback message",
  "data": {},
  "error": null
}
```

### 8.1. Authentication & Security Module (Prefix: `/api/auth`)

#### 1. Signup Account
*   **Path**: `POST /api/auth/signup`
*   **Authentication**: None (Public)
*   **Body Parameters**:
    ```json
    {
      "email": "user@example.com",
      "password": "SecurePassword123",
      "name": "John Doe"
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "success": true,
      "status": 201,
      "message": "Signup successful",
      "data": {
        "token": "eyJhbGciOi...",
        "user": {
          "id": "c10d32f4-86a0-410a-b6fe-2ef448e9c20a",
          "email": "user@example.com",
          "name": "John Doe",
          "provider": "local"
        }
      },
      "error": null
    }
    ```

#### 2. Local Login
*   **Path**: `POST /api/auth/login`
*   **Authentication**: None (Rate-limited via Redis Brute-Force middleware)
*   **Body Parameters**:
    ```json
    {
      "email": "user@example.com",
      "password": "SecurePassword123"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "status": 200,
      "message": "Login successful",
      "data": {
        "token": "eyJhbGciOi...",
        "user": {
          "id": "c10d32f4-86a0-410a-b6fe-2ef448e9c20a",
          "email": "user@example.com",
          "name": "John Doe",
          "provider": "local"
        }
      },
      "error": null
    }
    ```

#### 3. Google OAuth Federated Login/Upsert
*   **Path**: `POST /api/auth/google`
*   **Authentication**: None (Public)
*   **Body Parameters**:
    ```json
    {
      "tokenId": "google-oauth-token-id-string",
      "email": "user@example.com",
      "name": "John Doe",
      "avatar_url": "https://lh3.googleusercontent.com/..."
    }
    ```
*   **Response (200 OK)**: Finds user by email; sets provider to `'google'` and records `google_id`. Issues a fresh JWT.

#### 4. Delink Google Auth
*   **Path**: `POST /api/auth/google/delink`
*   **Headers**: `Authorization: Bearer <JWT>`
*   **Response (200 OK)**: Resets account provider back to `'local'` and sets `google_id` to `null`.

---

### 8.2. User Account Management Module (Prefix: `/api/users`)

#### 1. Get Personal Profile
*   **Path**: `GET /api/users/profile`
*   **Headers**: `Authorization: Bearer <JWT>`
*   **Response (200 OK)**: Returns the user profile card. Omits `password_hash` automatically.

#### 2. Permanent Account Deletion (GDPR Compliance)
*   **Path**: `DELETE /api/users/delete`
*   **Headers**: `Authorization: Bearer <JWT>`
*   **Action**: Hard-deletes user entry, unlinks all relational data, logs out, and flushes brute-force cache.
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "status": 200,
      "message": "User data permanently deleted",
      "data": null,
      "error": null
    }
    ```

---

### 8.3. Search & Places Module (Root Path endpoints)

#### 1. Nearby Search
*   **Path**: `POST /nearby`
*   **Authentication**: None (Public)
*   **Body Parameters**:
    ```json
    {
      "latitude": 28.6139,
      "longitude": 77.2090,
      "category": "restaurant",
      "radius": 2,
      "keyword": "optional-filter-term",
      "opennow": false
    }
    ```
*   **API Internal Translation & Security**: Maps client category (e.g. `medical` $\rightarrow$ `pharmacy`) and safely translates raw status replies:
    *   *Google returns `REQUEST_DENIED`*: Backend catches and replies: *"🔒 Our location service is currently unavailable. We're working to fix this. Please try again later."*
    *   *Google returns `OVER_QUERY_LIMIT`*: Catch-and-format: *"⏳ We're experiencing high traffic right now. Please wait a moment and try your search again."*
*   **Response (200 OK - Standard Success Shape)**:
    ```json
    {
      "status": "success",
      "results": [
        {
          "name": "Nirula's Restaurant",
          "address": "Connaught Place, New Delhi",
          "rating": 4.1,
          "place_id": "ChIJ53123asdA89123",
          "map_url": "https://www.google.com/maps/dir/?api=1&origin=28.6139,77.2090&destination=28.6145,77.2099"
        }
      ]
    }
    ```

#### 2. Get User Lists
*   **Path**: `GET /lists`
*   **Response (200 OK)**: Returns list of named directories. (Uses in-memory `Map` backend store currently).

#### 3. Save Place to List
*   **Path**: `POST /lists`
*   **Body Parameters**:
    ```json
    {
      "listName": "My Favorite Cafes",
      "place": {
        "place_id": "ChIJ53123asdA89123",
        "name": "Blue Tokai Coffee",
        "address": "Saket, New Delhi",
        "rating": 4.6,
        "map_url": "https://www.google.com/maps..."
      }
    }
    ```

---

## 🔍 9. Core Codebase Inconsistencies & Gaps (Critical for AI Enhancement)

When tasking an AI to deploy enhancements, keep these gaps in mind:

1.  **Missing `recharts` Dependency in Frontend**:
    *   *Inconsistency*: `frontend/src/views/AdminAnalytics.jsx` imports `ResponsiveContainer`, `LineChart`, etc. from `recharts`. However, `recharts` is **not** declared in `frontend/package.json`.
    *   *Action Required before launch*: Run `npm install recharts` inside the `frontend/` directory.
2.  **Unregistered Admin Telemetry Dashboard API Endpoint**:
    *   *Inconsistency*: `backend/controllers/analyticsController.js` defines a fully operational, Redis-integrated `getAnalyticsDashboard` controller. However, this is imported in `backend/index.js` but **never registered to an Express route**.
    *   *Action Required to implement*: Add `app.get('/api/analytics/dashboard', authJwt, adminCheck, getAnalyticsDashboard);` to `backend/index.js` below `/api/users`.
3.  **Unpersisted In-Memory Lists Engine**:
    *   *Inconsistency*: The `/lists` CRUD endpoints in `backend/index.js` read and write to an in-memory `const lists = new Map();`. This resets whenever the server restarts.
    *   *Action Required to persist*: Refactor `/lists` to save data inside PostgreSQL using a `places_lists` and `saved_places` relational join structure, using Knex query builder.
4.  **Static Geo-IP Telemetry**:
    *   *Inconsistency*: The `analyticsTracker.js` middleware has a hardcoded country lookup: `const country = 'US';`.
    *   *Action Required*: Integrate a lightweight free geo-ip package (like `geoip-lite`) to parse `req.ip` dynamically.

---

## 🚀 10. System Cheat Sheet & Commands

### Setup Environment
1. Clone the project.
2. Create `backend/.env` containing:
   ```env
   GOOGLE_API_KEY=your_real_places_api_key
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nearby_locator
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=your_jwt_signing_token_secret
   ```
3. Create `frontend/.env` containing:
   ```env
   VITE_BACKEND_URL=http://localhost:5000
   ```

### Execution Directives

#### Local Manual Startup
```bash
# Terminal 1: Spin up Postgres & Redis locally or through Docker
docker run --name pg-local -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
docker run --name redis-local -p 6379:6379 -d redis

# Terminal 2: Run Backend migrations and Start server
cd backend
npm install
npm run migrate
npm run dev

# Terminal 3: Run React Client
cd frontend
npm install
npm run dev
```

#### Docker-Compose Automated Startup
```bash
# Development (with volume linking and hot reload)
docker-compose -f docker-compose.dev.yml up --build

# Production (with full Nginx reverse proxy routing)
docker-compose up --build
```
