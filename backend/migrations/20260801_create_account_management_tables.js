/**
 * Migration: Create Account Management & User Management tables.
 * Tables: user_profiles, user_preferences, user_account_exports.
 */
export async function up(knex) {
  // 1. User Profiles Table
  await knex.schema.createTable('user_profiles', (table) => {
    table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
    table.string('first_name', 100).nullable();
    table.string('last_name', 100).nullable();
    table.string('display_name', 150).nullable();
    table.string('username', 50).unique().nullable();
    table.text('bio').nullable();
    table.string('phone', 30).nullable();
    table.string('address', 255).nullable();
    table.string('country', 100).nullable();
    table.string('state', 100).nullable();
    table.string('city', 100).nullable();
    table.string('postal_code', 20).nullable();
    table.string('timezone', 50).notNullable().defaultTo('UTC');
    table.string('language', 10).notNullable().defaultTo('en');
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    table.index(['username'], 'idx_user_profiles_username');
  });

  // 2. User Preferences Table (Consolidated Preferences, Privacy, Notification Settings)
  await knex.schema.createTable('user_preferences', (table) => {
    table.uuid('user_id').primary().references('id').inTable('users').onDelete('CASCADE');
    table.string('theme', 20).notNullable().defaultTo('system');
    table.string('language', 10).notNullable().defaultTo('en');
    table.string('timezone', 50).notNullable().defaultTo('UTC');
    table.jsonb('search_preferences').notNullable().defaultTo('{}');
    table.jsonb('ai_preferences').notNullable().defaultTo('{}');
    table.jsonb('privacy_settings').notNullable().defaultTo(
      JSON.stringify({
        profile_visibility: 'private',
        recommendation_preferences: {},
        marketing_preferences: { email: false, in_app: true }
      })
    );
    table.jsonb('notification_settings').notNullable().defaultTo(
      JSON.stringify({
        email_notifications: { marketing: false, security: true, updates: true },
        in_app_notifications: { mentions: true, activity: true },
        security_alerts: true
      })
    );
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
  });

  // 3. User Account Exports Table
  await knex.schema.createTable('user_account_exports', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('status', 20).notNullable().defaultTo('PENDING'); // PENDING | PROCESSING | COMPLETED | FAILED
    table.text('file_path').nullable();
    table.string('download_token', 255).nullable();
    table.timestamp('expires_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    table.index(['user_id'], 'idx_user_exports_user_id');
    table.index(['download_token'], 'idx_user_exports_token');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('user_account_exports');
  await knex.schema.dropTableIfExists('user_preferences');
  await knex.schema.dropTableIfExists('user_profiles');
}
