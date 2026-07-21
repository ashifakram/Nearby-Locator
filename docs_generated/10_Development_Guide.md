# Nearby Locator - Development Guide

## Workflow
1. **Frontend**: The `frontend/src` directory uses Feature-Sliced Design.
    - Add new domain features under `/features`.
    - Put generic, reusable UI in `/components`.
    - Route entry points belong in `/pages`.
2. **Backend**:
    - Place routing rules in `/routes`.
    - Business logic in `/controllers`.
    - Database logic MUST use Knex within `/repositories`. Avoid raw queries unless leveraging PostGIS functions (e.g. `ST_Distance`).
3. **Migrations**:
    - Run `npm run migrate` before developing.
    - Never modify existing migrations; always create a new timestamped file in `/migrations`.
4. **Testing**:
    - Run unit tests with `npm test` using Jest.
