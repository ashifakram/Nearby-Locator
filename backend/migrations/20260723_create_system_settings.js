/**
 * Phase 25: System Settings Database Migration
 */
export async function up(knex) {
  await knex.schema.createTable('system_settings', (table) => {
    table.string('key', 100).primary();
    table.text('value').nullable();
    table.string('category', 50).notNullable();
    table.string('description', 255).nullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
  });

  // Seed initial default configurations
  const defaultSettings = [
    // General Settings
    { key: 'app_name', value: 'Nearby Locator', category: 'general', description: 'Application name displayed in headers and emails' },
    { key: 'company_name', value: 'Nearby Corp', category: 'general', description: 'Parent organization or company name' },
    { key: 'default_timezone', value: 'UTC', category: 'general', description: 'Default timezone for UI and email dates' },
    { key: 'default_language', value: 'en', category: 'general', description: 'Default system fallback language (en, es, fr)' },
    { key: 'support_email', value: 'support@nearby-dev.local', category: 'general', description: 'Administrative support email address' },

    // Security Settings
    { key: 'password_min_length', value: '8', category: 'security', description: 'Minimum number of characters required for user passwords' },
    { key: 'account_lockout_attempts', value: '5', category: 'security', description: 'Maximum failed logins before locking user profiles' },
    { key: 'session_timeout_minutes', value: '120', category: 'security', description: 'Maximum active user session duration before automatic expiration' },
    { key: 'sudo_timeout_seconds', value: '300', category: 'security', description: 'Duration of step-up administrative elevation' },
    { key: 'jwt_algorithm', value: 'HS256', category: 'security', description: 'Token signature encryption algorithm' },

    // Authentication Settings
    { key: 'registration_enabled', value: 'true', category: 'authentication', description: 'Allow new visitor profile registrations' },
    { key: 'email_verification_required', value: 'true', category: 'authentication', description: 'Require verifying email address before activating accounts' },
    { key: 'google_login_enabled', value: 'true', category: 'authentication', description: 'Allow logging in using Google accounts' },
    { key: 'login_policy_max_sessions', value: '5', category: 'authentication', description: 'Maximum active concurrent login sessions per user profile' },

    // Notification Settings
    { key: 'email_notifications_enabled', value: 'true', category: 'notifications', description: 'Allow outbound system email dispatches' },
    { key: 'webhook_delivery_retries', value: '3', category: 'notifications', description: 'Maximum retry deliveries for failing webhook events' },
    { key: 'alert_preference_level', value: 'warning', category: 'notifications', description: 'Minimum log severity level for alerts' },

    // Retention Settings
    { key: 'log_retention_days', value: '90', category: 'retention', description: 'Clean up historic system logs after this number of days' },
    { key: 'audit_retention_days', value: '365', category: 'retention', description: 'Clean up security audit trails after this number of days' },
    { key: 'analytics_retention_days', value: '180', category: 'retention', description: 'Clean up rollups analytics records after this number of days' },

    // Branding Settings
    { key: 'brand_logo_url', value: '', category: 'branding', description: 'Optional custom logo image URL' },
    { key: 'brand_primary_color', value: '#4f46e5', category: 'branding', description: 'Primary highlight color code' },
    { key: 'organization_name', value: 'Nearby Inc', category: 'branding', description: 'Branding organization name' }
  ];

  await knex('system_settings').insert(defaultSettings).onConflict('key').ignore();
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('system_settings');
}
