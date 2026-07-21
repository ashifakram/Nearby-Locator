# 00: Engineering Standards

This document defines the strict, non-negotiable engineering rules that must be followed during the implementation of the target architecture.

## 1. The 4-Tier Layer System

The application architecture officially mandates a strict, un-bypassable 4-tier layer system to separate orchestration, domain logic, and persistence.

1.  **Controllers** (Edge / HTTP / DTO Mapping)
2.  **Application Services** (e.g., `AuthenticationService` - orchestrates multi-domain workflows)
3.  **Domain Services** (e.g., `IdentityService`, `SessionService` - isolated, atomic domain logic)
4.  **Repositories** (Dumb persistence boundary)
5.  **Database** (Storage)

### Permanently Banned Architectural Anti-Patterns:
*   **`Controller` ➔ `Repository`**: No shortcuts. Controllers must always call services.
*   **`Application Service` ➔ `Database`**: No bypassing repositories via direct Knex injections.
*   **`Domain Service` ➔ `Domain Service`**: Domain Services may **never** call each other. No horizontal circular dependencies.
*   **`Repository` ➔ `Repository`**: Repositories may **never** call other repositories.

### Transaction & Orchestration Mandates:
*   **Application Services** are the **ONLY** layer allowed to coordinate multiple Domain Services inside a single transaction.
*   **Controllers** may **never** open transactions.

*Every future feature (OAuth, MFA, Device Management) will rigidly follow this identical layering consistency.*

---

## 2. Repository Layer Standards

To ensure architectural integrity across the application, every repository implemented must strictly adhere to the following 10 persistence boundary rules:

1. **No Business Logic:** Repositories exist solely to read and write state. They do not orchestrate workflows.
2. **No Authorization Logic:** Role and permission checks belong exclusively in the Middleware and Service layers.
3. **No Transaction Ownership:** Repositories never begin or commit transactions (e.g., they never call `db.transaction()`). Transaction lifecycles are exclusively orchestrated by Services.
4. **Accept Executor Context:** Every method must accept an `executor` (either a generic Knex instance or an active Knex Transaction object) as its final parameter.
5. **Strict Return Types:** Methods must only return exact domain entities, `undefined`, an array of objects, or a numerical affected row count (for updates/deletions).
6. **No Business/Domain Errors:** Repositories do not throw domain-specific errors (e.g., `SESSION_ALREADY_ROTATED`, `INVALID_CREDENTIALS`). They assume inputs are pre-validated by the Service layer.
7. **Wrap Infrastructure Errors:** All raw SQL errors must be caught and wrapped via generic infrastructure handlers (e.g., `handleDbError`) to mask internal database states.
8. **Mandatory Documentation:** Every public repository method must be decorated with comprehensive JSDoc explaining its inputs, exact return types, and locking behaviors.
9. **No Service Imports:** Repositories may never import modules from the `backend/services/` directory to prevent circular dependency structures.
10. **Bounded Persistence Context:** One repository = one persistence boundary. Repositories manage specific domain tables (e.g., `SessionRepository` strictly manages `user_sessions`) and must be split if they begin crossing distinct domains to avoid becoming God Repositories.
