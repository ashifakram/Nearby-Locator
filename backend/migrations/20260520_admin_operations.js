/**
 * Migration: Create audit_logs and moderation_history tables, and add is_suspended flag to users.
 */
export async function up(knex) {
  // 1. Alter users table to add is_suspended status
  await knex.schema.alterTable('users', (table) => {
    table.boolean('is_suspended').defaultTo(false).notNullable();
    table.index(['is_suspended'], 'idx_users_suspended');
  });

  // 2. Create immutable-by-discipline audit_logs table
  await knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Actor - references users.id, nullable for system/break-glass actions
    table.uuid('actor_id').references('id').inTable('users').onDelete('SET NULL').nullable();

    // Target User - references users.id, nullable
    table.uuid('target_user_id').references('id').inTable('users').onDelete('SET NULL').nullable();

    table.string('action', 100).notNullable();
    table.string('severity', 20).defaultTo('INFO').notNullable(); // 'INFO' | 'WARNING' | 'CRITICAL'
    table.string('ip_address', 45).notNullable(); // supports IPv4 and IPv6
    
    // Restricted JSONB metadata with strict allowlist validation at application layer
    table.jsonb('metadata').notNullable().defaultTo('{}');

    table.timestamp('occurred_at').defaultTo(knex.fn.now()).notNullable();

    // Index fields for fast operational visibility and paginated search queries
    table.index(['occurred_at'], 'idx_audit_occurred');
    table.index(['action', 'occurred_at'], 'idx_audit_action_occurred');
    table.index(['actor_id', 'occurred_at'], 'idx_audit_actor_occurred');
    table.index(['target_user_id', 'occurred_at'], 'idx_audit_target_occurred');
  });

  // 3. Create moderation_history table
  await knex.schema.createTable('moderation_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('moderator_id').references('id').inTable('users').onDelete('SET NULL').nullable();
    
    table.string('action', 50).notNullable(); // 'SUSPEND' | 'UNSUSPEND' | 'REVOKE_SESSIONS'
    table.text('reason').notNullable();
    table.text('notes').nullable();
    
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    table.index(['user_id'], 'idx_mod_history_user');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('moderation_history');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.alterTable('users', (table) => {
    table.dropIndex(['is_suspended'], 'idx_users_suspended');
    table.dropColumn('is_suspended');
  });
}
