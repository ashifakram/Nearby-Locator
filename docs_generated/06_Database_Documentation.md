# Nearby Locator - Database Documentation

## Engine
PostgreSQL 17.x with PostGIS extension.

## Core Schema
- **Identity**: `users`, `user_sessions`, `login_attempts`.
- **Geospatial**: `spots` (contains geometry/geography columns for precise location search).
- **Discovery**: `discovery_searches`, `discovery_clicks`, `discovery_saves` (powers popularity ranking).
- **Moderation**: `reports`, `moderation_appeals`, `spot_moderation_history`.
- **Admin & Telemetry**: `analytics_events`, `daily_analytics_rollups`, `audit_logs`, `system_errors`.
- **Query Intelligence**: `search_synonyms`, `search_terms`, `search_suggestions`.
- **Notifications**: `user_notification_preferences`, `webhook_subscriptions`, `webhook_deliveries`.

## Spatial Features
Relies heavily on `ST_DWithin`, `ST_Distance`, and `ST_SnapToGrid` (for map clustering) to provide fast radius searches and zoom-aware map cluster rendering.
