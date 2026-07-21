# Nearby Locator - Technical Design Document

## 1. System Context
The platform provides a secure API for fetching categorized geographical locations ("spots") using advanced ranking algorithms taking distance, freshness, and community engagement into account.

## 2. Ranking Algorithm
The `SpotRepository` implements a Greedy Maximal Marginal Relevance (MMR) ranking. The CTE calculates a `composite_score` taking:
- `distance_score`
- `freshness_score` (time since update)
- `popularity_score` (historical clicks/saves)
- `trending_boost` (recent week activity)
- Penalties applied for: spam, soft duplicates, density clustering, and moderation status.

## 3. Resilience
- Database operations are wrapped in `withTransientRetry`.
- Brute-force limiters block requests at the API Gateway using sliding Redis windows.
