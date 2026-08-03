const fs = require('fs');
const content = `
  /admin/sudo-confirm:
    $ref: './paths/admin.yaml#/SudoConfirm'
  /admin/users:
    $ref: './paths/admin.yaml#/Users'
  /admin/users/{userId}/suspend:
    $ref: './paths/admin.yaml#/SuspendUser'
  /admin/users/{userId}/unlock:
    $ref: './paths/admin.yaml#/UnlockUser'
  /admin/users/{userId}/logout:
    $ref: './paths/admin.yaml#/LogoutUser'
  /admin/roles/{roleId}/permissions:
    $ref: './paths/admin.yaml#/UpdateRolePermissions'
  /admin/users/{userId}/role:
    $ref: './paths/admin.yaml#/EscalateRole'
  /admin/impersonate:
    $ref: './paths/admin.yaml#/Impersonate'
  /admin/export-data:
    $ref: './paths/admin.yaml#/ExportData'
  /admin/export-status/{exportId}:
    $ref: './paths/admin.yaml#/ExportStatus'
  /admin/downloads/{token}:
    $ref: './paths/admin.yaml#/Downloads'
  /admin/retention-override:
    $ref: './paths/admin.yaml#/RetentionOverride'
  /admin/audit-logs:
    $ref: './paths/admin.yaml#/AuditLogs'
  /admin/control-plane-metrics:
    $ref: './paths/admin.yaml#/ControlPlaneMetrics'
  /admin/auth-events:
    $ref: './paths/admin.yaml#/AuthEvents'
  /admin/system-errors:
    $ref: './paths/admin.yaml#/SystemErrors'
  /admin/sessions:
    $ref: './paths/admin.yaml#/Sessions'
  /admin/sessions/{id}:
    $ref: './paths/admin.yaml#/RevokeSession'
  /admin/sessions/user/{userId}:
    $ref: './paths/admin.yaml#/RevokeUserSessions'
  /discovery/search:
    $ref: './paths/discovery.yaml#/Search'
  /discovery/click:
    $ref: './paths/discovery.yaml#/Click'
  /discovery/save:
    $ref: './paths/discovery.yaml#/Save'
  /discovery/saves:
    $ref: './paths/discovery.yaml#/Saves'
  /discovery/history:
    $ref: './paths/discovery.yaml#/History'
  /discovery/telemetry:
    $ref: './paths/discovery.yaml#/Telemetry'
  /discovery/autocomplete:
    $ref: './paths/discovery.yaml#/Autocomplete'
  /health/live:
    $ref: './paths/health.yaml#/Live'
  /health/ready:
    $ref: './paths/health.yaml#/Ready'
  /health/db:
    $ref: './paths/health.yaml#/Db'
  /health/redis:
    $ref: './paths/health.yaml#/Redis'
  /health/metrics:
    $ref: './paths/health.yaml#/Metrics'
  /moderation/reports:
    $ref: './paths/moderation.yaml#/Appeals'
  /moderation/appeals:
    $ref: './paths/moderation.yaml#/Appeals'
  /moderation/admin/queue:
    $ref: './paths/moderation.yaml#/AdminQueue'
  /moderation/admin/reports/{reportId}/resolve:
    $ref: './paths/moderation.yaml#/AdminResolveReport'
  /moderation/admin/spots/{spotId}/action:
    $ref: './paths/moderation.yaml#/AdminActionSpot'
  /moderation/admin/appeals/{appealId}/resolve:
    $ref: './paths/moderation.yaml#/AdminResolveAppeal'
  /notifications/preferences:
    $ref: './paths/notifications.yaml#/PreferencesGet'
  /notifications/test:
    $ref: './paths/notifications.yaml#/Test'
  /notifications/webhooks/subscriptions:
    $ref: './paths/notifications.yaml#/WebhookSubscriptions'
  /notifications/providers/webhooks:
    $ref: './paths/notifications.yaml#/ProvidersWebhooks'
  /notifications/telemetry:
    $ref: './paths/notifications.yaml#/Telemetry'
  /notifications/password-reset-trigger:
    $ref: './paths/notifications.yaml#/PasswordResetTrigger'
  /spots/:
    $ref: './paths/spots.yaml#/CreateSpot'
  /spots/search:
    $ref: './paths/spots.yaml#/SearchSpots'
  /spots/clusters:
    $ref: './paths/spots.yaml#/Clusters'
  /auth/sessions:
    $ref: './paths/auth.yaml#/SessionsGet'
  /auth/providers/{providerName}:
    $ref: './paths/auth.yaml#/ProviderDelete'
  /users/delete:
    $ref: './paths/users.yaml#/DeleteUser'
`;
const lines = fs.readFileSync('docs/openapi.yaml', 'utf8').split('\n');
const componentsIdx = lines.findIndex(l => l.startsWith('components:'));
lines.splice(componentsIdx, 0, content);
fs.writeFileSync('docs/openapi.yaml', lines.join('\n'));
