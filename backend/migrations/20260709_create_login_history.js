/**
 * Migration: Create login_history table for successful logins display in UI.
 */

export async function up(knex) {
  await knex.schema.createTable('login_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('session_family_id').nullable(); // Link to active session if available
    
    table.string('login_method', 50).notNullable(); // e.g., 'local', 'google', 'apple'
    
    table.string('device_type', 50).nullable(); // 'Mobile', 'Desktop', 'Tablet'
    table.string('os_name', 50).nullable(); // 'iOS', 'Windows', 'macOS'
    table.string('browser_name', 50).nullable(); // 'Safari', 'Chrome'
    table.string('location_city', 100).nullable(); // e.g., 'San Francisco, CA'
    
    table.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());

    // Indexed for fast UI pagination per user
    table.index(['user_id', 'occurred_at'], 'idx_login_history_user_time');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('login_history');
}
