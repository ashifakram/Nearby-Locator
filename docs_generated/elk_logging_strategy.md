# ELK Logging Strategy

To effectively utilize Elasticsearch, Logstash, and Kibana (ELK), backend logs must transition from flat stdout strings to rich, contextual, structured JSON.

## Core Principle
Every log emitted by the system must be a valid JSON object. Application logs are distinct from DB Audit Logs: Application logs are ephemeral (e.g., 30-day retention), high-volume, and capture granular technical details (stack traces, SQL execution times, HTTP payloads).

---

## Structured Log Format

Every log payload will adhere to this standard JSON format:

```json
{
  "@timestamp": "2026-07-08T16:50:00.000Z",
  "level": "INFO",
  "service": "authentication-api",
  "environment": "production",
  "correlationId": "req-9a96350f",
  
  "context": {
    "userId": "uuid-1234",
    "sessionId": "uuid-5678",
    "sessionFamilyId": "uuid-9012"
  },
  
  "event": {
    "action": "OAUTH_LOGIN",
    "status": "SUCCESS",
    "durationMs": 142
  },
  
  "http": {
    "method": "POST",
    "path": "/api/auth/google",
    "ip": "192.168.1.1",
    "userAgent": "Mozilla/5.0..."
  },
  
  "message": "Google OAuth profile verified and session established.",
  
  "error": {
    "code": "INVALID_GRANT",
    "stack": "Error: Invalid token... at Object.verify...",
    "fatal": false
  }
}
```

## Mandatory vs Recommended Fields

### Mandatory (On every log)
- `@timestamp`
- `level` (DEBUG, INFO, WARN, ERROR, FATAL)
- `service`
- `correlationId` (Injected via express middleware at the edge to track a request across all services/DB queries).
- `message`

### Recommended (When applicable)
- `context.userId` / `context.sessionId`: Essential for tracing a specific user's journey through Kibana.
- `http.*`: For tracking API abuse.
- `event.durationMs`: Critical for spotting slow queries/bcrypt hangs.

## Stack Trace Policy
- **DO NOT** log stack traces for user-driven domain errors (e.g., `INVALID_CREDENTIALS`, `RATE_LIMITED`). These are `INFO` or `WARN` logs.
- **DO** log deep stack traces for `500 Internal Server Error` (e.g., database connection dropped, Redis offline).
- **NEVER** log raw passwords, PII tokens, or Authorization headers. The logger must explicitly redact `password`, `oldPassword`, `newPassword`, and `token` fields.
