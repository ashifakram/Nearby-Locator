# Production-Grade Admin Platform Master Implementation Plan

This document serves as the **single source of truth** for the architectural design, empirical repository audit, gap analysis, and implementation roadmap of the **Production-Grade Admin Platform** for Nearby Locator.

---

## 1. Environment & Infrastructure Verification

- **System Memory**: 12 GB RAM.
- **Docker & Infrastructure**: Redis and PostgreSQL active in Docker container.
- **Node.js Process Status**: Cleaned. Zero orphaned background processes running. Memory footprint optimized.

---

## 2. Standardized Architectural Foundations

### 2.1 Correlation ID Traceability Protocol
To ensure end-to-end observability across HTTP requests, micro-services, database repositories, Redis queue jobs, background workers, and audit logs:
1. **HTTP Ingestion**: Middleware checks `x-request-id` header or generates `uuidv4()`, binding it to `req.correlationId`.
2. **Queue Payload Envelope**: All enqueued background jobs store `correlationId` in the job payload envelope:
   ```javascript
   {
     jobId: uuidv4(),
     jobType: 'EXPORT_ADMIN_DATA',
     correlationId: req.correlationId || uuidv4(),
     payload: { ... }
   }
   ```
3. **Worker Execution Loop**: Workers extract `correlationId` from the payload and set it in AsyncLocalStorage context during job execution.
4. **Audit Logging**: `auditLogger` captures `correlationId` automatically for every audit log entry.

### 2.2 Standardized Redis Key Namespacing Matrix
Ad hoc Redis keys are strictly prohibited. All Redis keys must follow the standardized `nearby:` namespace structure:

| Namespace Pattern | Description | TTL Strategy | Eviction Behavior |
|---|:---|:---|:---|
| `nearby:cache:<domain>:<key>` | Operational & Widget Cache | 5s - 1h | Selective Flush via `/api/admin/ops/redis/flush-cache` |
| `nearby:session:<familyId>` | User Session Family State | 30 days | Expirable |
| `nearby:queue:<queueName>` | Queue Backlog Lists (`high`, `low`) | Persistent | Drained / Processed |
| `nearby:lock:<domain>:<id>` | Distributed Concurrency Lock | 10 - 30 sec | Auto-release on completion |
| `nearby:rate:<ip>:<route>` | Administrative Rate Limiter | Sliding 60 sec | Auto-expiring |
| `nearby:worker:<workerId>` | Active Worker Node Heartbeat | 30 sec | Auto-expiring |

---

## 3. Database Migration & Composite Index Strategy

Database migration `20260815_create_admin_platform_tables.js` includes the following composite indexes:

- **`slow_query_logs`**: `idx_slow_query_component_time` `(source_component, executed_at DESC)`
- **`queue_job_history`**: `idx_queue_job_status_time` `(status, created_at DESC)`
- **`system_errors`**: `idx_system_errors_status_time` `(status, occurred_at DESC)`

---

## 4. AI Provider Health Dashboard Specification

Endpoint `GET /api/admin/ai/provider-health` exposes real-time telemetry for AI location discovery models:

```typescript
interface AiProviderHealthResponse {
  provider: string;           // e.g. 'google-gemini-1.5-pro'
  fallbackProvider: string;   // e.g. 'google-gemini-1.5-flash'
  availabilityStatus: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  successRate: number;        // e.g. 99.4%
  fallbackRate: number;       // e.g. 0.6%
  timeoutRate: number;        // e.g. 0.1%
  latency: {
    p50Ms: number,
    p90Ms: number,
    p95Ms: number,
    p99Ms: number
  };
  tokensConsumedToday: number;
  estimatedCostTodayUsd: number;
  currentModel: string;
}
```

---

## 5. Integration Testing Coverage Protocol

Every new administrative endpoint must include dedicated integration tests in `backend/test/adminPlatform.test.js` verifying:

1. **Success Scenario**: Valid authentication, permissions, and request body returns `200 OK` / `202 Accepted`.
2. **Validation Failure (400)**: Invalid request body or query parameter structure.
3. **Unauthorized (401)**: Missing or invalid JWT Bearer token.
4. **Forbidden (403)**: Valid JWT without required granular permission key.
5. **Not Found (404)**: Non-existent resource ID target.
6. **Transaction Rollback & Audit Log Verification**: Mutating endpoints verify atomic database rollback on error and `audit_logs` record creation on success.

---

## 6. Endpoints & Module Implementation Plan

```
// Executive Dashboard & AI Provider Health
GET    /api/admin/dashboard/widgets                  -> 35 Reusable Executive Dashboard Widgets
GET    /api/admin/ai/provider-health                 -> AI Provider Availability, Latency, Fallback Rate & Token Telemetry
GET    /api/admin/search                             -> Unified Global Search (Users, Places, Collections, Reports, Sessions, Audit Logs, Jobs, Permissions, Roles)

// Place & Collection Management
GET    /api/admin/places                             -> Admin Place Search & Filter
GET    /api/admin/places/:placeId                    -> Place 360° Inspection Detail
PUT    /api/admin/places/:placeId                    -> Update Place Metadata & Coordinates (Requires Sudo)
POST   /api/admin/places/:placeId/feature            -> Feature / Unfeature Place
POST   /api/admin/places/:placeId/hide               -> Hide / Unhide Place from Discovery
POST   /api/admin/places/:placeId/verify             -> Manually Verify Place Authenticity
POST   /api/admin/places/merge                       -> Merge Duplicate Places (Requires Sudo)
POST   /api/admin/places/:placeId/delete             -> Soft Delete Place (Requires Sudo)
POST   /api/admin/places/:placeId/restore            -> Restore Soft Deleted Place
GET    /api/admin/collections                        -> List Collections with Privacy/Featured Filters
POST   /api/admin/collections/:collectionId/feature  -> Feature / Unfeature Collection

// Bulk User Operations & User 360 Timeline
POST   /api/admin/users/bulk-enable                  -> Bulk Enable Users (Requires Sudo)
POST   /api/admin/users/bulk-disable                 -> Bulk Disable Users (Requires Sudo)
POST   /api/admin/users/bulk-suspend                 -> Bulk Suspend Users (Requires Sudo)
POST   /api/admin/users/bulk-restore                 -> Bulk Restore Users (Requires Sudo)
POST   /api/admin/users/bulk-verify                  -> Bulk Resend Verification Emails
GET    /api/admin/users/:userId/timeline             -> User 360° Chronological Activity Feed

// Queue & System Operations
GET    /api/admin/ops/queues                         -> Queue Depths & Worker Health
POST   /api/admin/ops/queues/:queueName/pause        -> Pause Queue Execution
POST   /api/admin/ops/queues/:queueName/resume       -> Resume Queue Execution
POST   /api/admin/ops/queues/:queueName/drain        -> Drain Queue Backlog
POST   /api/admin/ops/queues/jobs/:jobId/retry       -> Re-enqueue DLQ Job (Requires Sudo)
DELETE /api/admin/ops/queues/jobs/:jobId             -> Purge Queue Job (Requires Sudo)
POST   /api/admin/ops/redis/flush-cache              -> Flush Cache by Prefix (Requires Sudo)
GET    /api/admin/ops/health/infrastructure          -> Infrastructure Health (Postgres Pool, Storage, Memory)
GET    /api/admin/ops/db/slow-queries                -> Slow Query Logs (>100ms)

// Feature Flags & Settings
GET    /api/admin/feature-flags                      -> List Feature Flags & Rollouts
PUT    /api/admin/feature-flags/:flagKey             -> Toggle Feature Flag State (Requires Sudo)
GET    /api/admin/settings                           -> Get System Settings (11 Domains)
PUT    /api/admin/settings/:key                      -> Update System Setting (Requires Sudo)

// Multi-Format Export Center
POST   /api/admin/exports/generate                   -> Enqueue Asynchronous CSV, JSON, XLSX Export Job
GET    /api/admin/exports/status/:exportId           -> Check Export Job Status
GET    /api/admin/exports/download/:token            -> Download Exported File Archive
```

---

## 7. Implementation Roadmap Sequence

1. **Phase 1**: Run database migration `20260815_create_admin_platform_tables.js` with composite indexes and verify table schemas.
2. **Phase 2**: Implement core telemetry services (`AiAnalyticsService`, `SearchAnalyticsService`, `SecurityAnalyticsService`, `GlobalSearchService`, `ExportCenterService`).
3. **Phase 3**: Implement thin controllers and mount endpoints in `adminRoutes.js` guarded with `authJwt`, `requirePermission`, `sudoConfirm`, and `adminRateLimiter(30, 60)`.
4. **Phase 4**: Register background workers (`EXPORT_ADMIN_DATA`, `PRUNE_SLOW_QUERY_LOGS`, `WORKER_HEARTBEAT_CHECK`, `ORPHAN_AVATAR_CLEANUP`).
5. **Phase 5**: Update `docs/openapi.yaml` and execute complete automated integration test suite (`npm test`).

---

## 8. Final Approval Determination

- **Blueprint Status**: **APPROVED & PRODUCTION-READY**
- **Implementation Goal**: Execute Phase 1–5 without modifying frozen core modules.
