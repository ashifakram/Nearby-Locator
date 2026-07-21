# Implementation Plan: Phase 1 Architecture

## Context
The current backend is a basic Express server with Google Places API integration and in-memory storage. It lacks proper database persistence, authentication, security measures, and standardized API responses. This plan implements Phase 1 as specified in prompt.txt.txt to establish a production-grade backend with PostgreSQL, Redis, proper authentication, and security middleware.

## Problem Statement
The existing backend needs to be upgraded to:
1. Use PostgreSQL 17 for persistent storage with proper schema and audit tracking
2. Implement standardized API response format for all endpoints
3. Add authentication system with local and Google OAuth support
4. Implement enterprise security including brute-force protection and input validation
5. Ensure all code is production-grade, bug-free, and fully tested

## Recommended Approach
### Phase 1 Implementation Steps:

1. **Database Setup**
   - Install PostgreSQL dependencies (pg, sequelize or knex)
   - Create database initialization script with required tables:
     - `users` table with id, email (unique, indexed), password_hash, name, avatar_url, provider ENUM, google_id (unique, indexed), status ENUM
     - `login_attempts` table with id, email, ip_address, country, is_successful, failure_reason, attempted_at
   - All tables include audit fields: created_at, updated_at, created_by, updated_by

2. **Standardized API Response**
   - Create response utility wrapper that enforces the exact format:
     - Success: { success: true, status, message, data, error: null }
     - Error: { success: false, status, message, data: null, error: { code, details } }

3. **Security Infrastructure**
   - Install and configure Redis client
   - Implement brute-force protection middleware using Redis to track failed attempts
   - Create global error handler middleware that catches all errors and formats them per standard
   - Implement input validation middleware for all routes

4. **Authentication System**
   - Implement POST `/api/auth/signup` with bcrypt password hashing
   - Implement POST `/api/auth/login` with JWT generation
   - Implement POST `/api/auth/google` for Google OAuth (upsert strategy)
   - Implement POST `/api/auth/google/delink` to disable Google auth
   - Implement DELETE `/api/users/delete` for GDPR compliance
   - Implement GET `/api/users/profile` protected route

5. **Testing**
   - Write integration tests covering all endpoints and edge cases
   - Test brute-force protection, duplicate registration, invalid inputs
   - Ensure 100% test pass rate before completion

## Critical Files to Modify/Create
- `backend/package.json` - Add dependencies (pg, sequelize/knex, redis, bcrypt, jsonwebtoken, validator, etc.)
- `backend/config.js` - Add database and Redis configuration
- `backend/database.js` - Database connection and initialization
- `backend/middleware/` - New directory for middleware:
  - `responseFormatter.js` - Standardized response wrapper
  - `errorHandler.js` - Global error handler
  - `bruteForceProtection.js` - Redis-based brute force protection
  - `validateInput.js` - Input validation middleware
- `backend/controllers/` - New directory for controllers:
  - `authController.js` - Authentication endpoints
  - `userController.js` - User profile and deletion endpoints
- `backend/routes/` - New directory for route definitions:
  - `authRoutes.js` - Authentication routes
  - `userRoutes.js' - User routes
- `backend/server.js` - Updated server entry point applying all middleware
- `backend/migrations/` - Database migration scripts
- `backend/__tests__/` - Integration test files

## Existing Code to Reuse
- Current `/nearby` endpoint can remain largely unchanged but should adopt new response format
- `/health` endpoint should be updated to use standardized response
- `/lists` endpoints should be updated to use PostgreSQL instead of in-memory Map
- Google Places API integration in `/nearby` can be preserved

## Verification Section
To verify implementation:
1. Run `npm test` to execute all integration tests
2. Manual testing of all endpoints:
   - POST `/api/auth/signup` with valid/invalid data
   - POST `/api/auth/login` with correct/incorrect credentials
   - POST `/api/auth/google` with mock Google token
   - Test brute-force protection by exceeding failed attempts
   - Test standardized response format on all endpoints
   - Verify database persistence after server restart
3. Check that no raw stack traces are exposed in error responses
4. Verify audit fields are properly populated in database records