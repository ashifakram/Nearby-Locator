# Nearby Locator - Frontend Documentation

## Core Structure
- `/src/app`: High-level app wrappers (Providers).
- `/src/features`: Domain-specific business logic and components (e.g., `chat-discovery`).
- `/src/pages`: Top-level route components (`admin`, `auth`, `error`, `landing`, `search`).
- `/src/components`: Generic, reusable UI components.
- `/src/store`: Zustand state management.
- `/src/services`: API client integrations (Axios).

## Technology Stack
- **React 19.2.0**: Core library.
- **React Router v7**: Client-side routing.
- **TailwindCSS**: Styling framework.
- **Zustand**: Lightweight global state management.
- **React Hook Form + Zod**: Schema-based form validation.
- **Axios**: HTTP client.

## Routing
Managed primarily through `/src/pages` matching domain logic. Ensure new pages are lazy-loaded for bundle optimization.
