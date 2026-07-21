/**
 * Migration: Create authentication_events and user_oauth_identities tables
 * These were defined in the frozen architecture but missed in initial schema migrations.
 */

export async function up(knex) {
  // Create authentication_events table
  await knex.schema.createTable('authentication_events', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').nullable(); // Nullable for failed logins of unknown users
    table.string('event_category').notNullable();
    table.string('event_type').notNullable();
    table.jsonb('metadata').notNullable().defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    
    // Indexes
    table.index(['user_id'], 'idx_auth_events_user_id');
    table.index(['event_category', 'event_type'], 'idx_auth_events_type');
    table.index(['created_at'], 'idx_auth_events_created');
  });

  // Create user_oauth_identities table
  await knex.schema.createTable('user_oauth_identities', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.string('provider').notNullable(); // e.g., 'google'
    table.string('provider_user_id').notNullable(); // Remote ID from provider
    table.jsonb('profile_data').nullable(); // Optional cached profile data
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
    
    // Indexes
    table.unique(['provider', 'provider_user_id'], 'idx_oauth_identities_remote');
    table.unique(['user_id', 'provider'], 'idx_oauth_identities_local');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('user_oauth_identities');
  await knex.schema.dropTableIfExists('authentication_events');
}
