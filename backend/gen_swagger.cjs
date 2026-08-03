const fs = require('fs');
const path = require('path');
const docsPath = path.join('docs', 'paths');

function appendYaml(file, content) {
  const fullPath = path.join(docsPath, file);
  if (fs.existsSync(fullPath)) {
    fs.appendFileSync(fullPath, '\n' + content);
  } else {
    fs.writeFileSync(fullPath, content);
  }
}

// 1. Admin Paths
appendYaml('admin.yaml', `
SudoConfirm:
  post:
    operationId: sudoConfirm
    tags: [Admin]
    summary: Sudo step-up verification
    responses:
      '200':
        description: Success
        content:
          application/json:
            schema:
              $ref: '../components/schemas.yaml#/StandardSuccess'

Users:
  get:
    operationId: getAdminUsers
    tags: [Admin]
    summary: List all users
    responses:
      '200':
        description: Success

SuspendUser:
  post:
    operationId: suspendUser
    tags: [Admin]
    summary: Suspend user
    responses:
      '200':
        description: Success

UnlockUser:
  post:
    operationId: unlockUser
    tags: [Admin]
    summary: Unlock user
    responses:
      '200':
        description: Success

LogoutUser:
  post:
    operationId: forceLogout
    tags: [Admin]
    summary: Force logout user
    responses:
      '200':
        description: Success

UpdateRolePermissions:
  put:
    operationId: updateRolePermissions
    tags: [Admin]
    summary: Update permissions for role
    responses:
      '200':
        description: Success

EscalateRole:
  put:
    operationId: escalateRole
    tags: [Admin]
    summary: Escalate user role
    responses:
      '200':
        description: Success

Impersonate:
  post:
    operationId: initiateImpersonation
    tags: [Admin]
    summary: Impersonate user
    responses:
      '200':
        description: Success

ExportData:
  post:
    operationId: exportUserData
    tags: [Admin]
    summary: Export user data
    responses:
      '200':
        description: Success

ExportStatus:
  get:
    operationId: getExportStatus
    tags: [Admin]
    summary: Get export status
    responses:
      '200':
        description: Success

Downloads:
  get:
    operationId: downloadExportedData
    tags: [Admin]
    summary: Download exported data
    responses:
      '200':
        description: Success

RetentionOverride:
  post:
    operationId: retentionOverride
    tags: [Admin]
    summary: Override retention policies
    responses:
      '200':
        description: Success

AuditLogs:
  get:
    operationId: getAuditLogs
    tags: [Admin]
    summary: Get audit logs
    responses:
      '200':
        description: Success

ControlPlaneMetrics:
  get:
    operationId: getControlPlaneMetrics
    tags: [Admin]
    summary: Get metrics
    responses:
      '200':
        description: Success

AuthEvents:
  get:
    operationId: getAuthEvents
    tags: [Admin]
    summary: Get auth events
    responses:
      '200':
        description: Success

SystemErrors:
  get:
    operationId: getSystemErrors
    tags: [Admin]
    summary: Get system errors
    responses:
      '200':
        description: Success

Sessions:
  get:
    operationId: getSessions
    tags: [Admin]
    summary: Get sessions
    responses:
      '200':
        description: Success

RevokeSession:
  delete:
    operationId: revokeSession
    tags: [Admin]
    summary: Revoke session
    responses:
      '200':
        description: Success

RevokeUserSessions:
  delete:
    operationId: revokeUserSessions
    tags: [Admin]
    summary: Revoke all user sessions
    responses:
      '200':
        description: Success
`);

// 2. Discovery
appendYaml('discovery.yaml', `
Search:
  get:
    operationId: searchDiscovery
    tags: [Discovery]
    summary: Search places
    responses:
      '200':
        description: Success

Click:
  post:
    operationId: logClick
    tags: [Discovery]
    summary: Log click event
    responses:
      '200':
        description: Success

Save:
  post:
    operationId: savePlace
    tags: [Discovery]
    summary: Save a place
    responses:
      '200':
        description: Success

Saves:
  get:
    operationId: getSavedPlaces
    tags: [Discovery]
    summary: Get saved places
    responses:
      '200':
        description: Success

History:
  get:
    operationId: getHistory
    tags: [Discovery]
    summary: Get history
    responses:
      '200':
        description: Success

Telemetry:
  get:
    operationId: getTelemetry
    tags: [Discovery]
    summary: Get telemetry
    responses:
      '200':
        description: Success

Autocomplete:
  get:
    operationId: autocomplete
    tags: [Discovery]
    summary: Autocomplete search
    responses:
      '200':
        description: Success
`);

// 3. Health
appendYaml('health.yaml', `
Live:
  get:
    operationId: getLive
    tags: [Health]
    summary: Liveness check
    responses:
      '200':
        description: Success

Ready:
  get:
    operationId: getReady
    tags: [Health]
    summary: Readiness check
    responses:
      '200':
        description: Success

Db:
  get:
    operationId: getDbHealth
    tags: [Health]
    summary: Database health
    responses:
      '200':
        description: Success

Redis:
  get:
    operationId: getRedisHealth
    tags: [Health]
    summary: Redis health
    responses:
      '200':
        description: Success

Metrics:
  get:
    operationId: getAppMetrics
    tags: [Health]
    summary: App metrics
    responses:
      '200':
        description: Success
`);

// 4. Moderation
appendYaml('moderation.yaml', `
Appeals:
  post:
    operationId: submitAppeal
    tags: [Moderation]
    summary: Submit appeal
    responses:
      '200':
        description: Success

AdminQueue:
  get:
    operationId: getAdminQueue
    tags: [Moderation]
    summary: Get admin moderation queue
    responses:
      '200':
        description: Success

AdminResolveReport:
  post:
    operationId: adminResolveReport
    tags: [Moderation]
    summary: Resolve a report
    responses:
      '200':
        description: Success

AdminActionSpot:
  post:
    operationId: adminActionSpot
    tags: [Moderation]
    summary: Action a spot
    responses:
      '200':
        description: Success

AdminResolveAppeal:
  post:
    operationId: adminResolveAppeal
    tags: [Moderation]
    summary: Resolve an appeal
    responses:
      '200':
        description: Success
`);

// 5. Notifications
appendYaml('notifications.yaml', `
PreferencesGet:
  get:
    operationId: getNotificationPreferences
    tags: [Notifications]
    summary: Get preferences
    responses:
      '200':
        description: Success

PreferencesPut:
  put:
    operationId: updateNotificationPreferences
    tags: [Notifications]
    summary: Update preferences
    responses:
      '200':
        description: Success

Test:
  post:
    operationId: testNotification
    tags: [Notifications]
    summary: Test notification
    responses:
      '200':
        description: Success

WebhookSubscriptions:
  post:
    operationId: subscribeWebhook
    tags: [Notifications]
    summary: Subscribe webhook
    responses:
      '200':
        description: Success

ProvidersWebhooks:
  post:
    operationId: handleProviderWebhook
    tags: [Notifications]
    summary: Handle provider webhook
    responses:
      '200':
        description: Success

Telemetry:
  get:
    operationId: getNotificationTelemetry
    tags: [Notifications]
    summary: Get notification telemetry
    responses:
      '200':
        description: Success

PasswordResetTrigger:
  post:
    operationId: passwordResetTrigger
    tags: [Notifications]
    summary: Password reset trigger
    responses:
      '200':
        description: Success
`);

// 6. Spots
appendYaml('spots.yaml', `
CreateSpot:
  post:
    operationId: createSpot
    tags: [Spots]
    summary: Create a spot
    responses:
      '200':
        description: Success

SearchSpots:
  get:
    operationId: searchSpots
    tags: [Spots]
    summary: Search spots
    responses:
      '200':
        description: Success

Clusters:
  get:
    operationId: getClusters
    tags: [Spots]
    summary: Get spot clusters
    responses:
      '200':
        description: Success
`);

// 7. Auth (Missing)
appendYaml('auth.yaml', `
SessionsGet:
  get:
    operationId: getAuthSessions
    tags: [Auth]
    summary: Get active auth sessions
    responses:
      '200':
        description: Success

ProviderDelete:
  delete:
    operationId: deleteProvider
    tags: [Auth]
    summary: Delete OAuth provider
    responses:
      '200':
        description: Success
`);

// 8. Users (Missing)
appendYaml('users.yaml', `
ProfileUpdate:
  put:
    operationId: updateProfile
    tags: [Users]
    summary: Update profile
    responses:
      '200':
        description: Success

DeleteUser:
  delete:
    operationId: deleteUserAccount
    tags: [Users]
    summary: Delete user account
    responses:
      '200':
        description: Success
`);
console.log('Successfully appended Swagger YAML definitions.');
