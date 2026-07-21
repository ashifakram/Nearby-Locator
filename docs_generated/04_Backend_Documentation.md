# Nearby Locator - Backend Documentation

## Core Structure
- `/routes`: Express router definitions.
- `/controllers`: HTTP request handling and business logic orchestration.
- `/repositories`: Database access layer utilizing Knex.js.
- `/migrations`: Database schema definitions and evolution.
- `/middleware`: Authentication, rate limiting, observability, and error handling.

## Key Subsystems
1. **Auth & Security**: JWT based, integrated with Redis for brute-force protection.
2. **Geospatial Engine**: Powered by PostGIS, implemented in `SpotRepository` with CTE-based discovery ranking and dynamic clustering.
3. **Admin Control Plane**: Extensive audit logging, impersonation, and telemetry.
4. **Trust & Moderation**: User reporting, appeals, and spot quarantining flows.
5. **Notifications**: Webhook and preference-based notification delivery system.
