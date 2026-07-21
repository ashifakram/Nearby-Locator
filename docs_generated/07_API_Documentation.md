# Nearby Locator - API Documentation

## Auth (`/api/auth`)
- `POST /signup`: Register local user.
- `POST /login`: Local sign-in with brute force protection.
- `POST /google`: Federated login.
- `POST /refresh`: Refresh session token.

## Spots (`/api/spots`)
- `GET /search`: Geospatial search using PostGIS distance operations.
- `GET /clusters`: Zoom-aware aggregation endpoint returning grid-snapped cluster centroids.

## Admin (`/api/admin`)
- `GET /audit-logs`: View system events.
- `POST /suspend`: Quarantine/suspend users.
- `POST /impersonate`: Issue impersonation tokens for debugging.

## Discovery (`/api/discovery`)
- `GET /search`: Advanced composite relevance search with MMR diversity.
- `POST /click`, `POST /save`: Track engagement for spot popularity scoring.

## Moderation (`/api/moderation`)
- `POST /reports`, `POST /appeals`: User-submitted content reviews.
