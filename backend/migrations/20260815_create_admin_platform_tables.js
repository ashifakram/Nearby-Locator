/**
 * Migration: Create Admin Platform tables for system settings, feature flags,
 * slow query logs, and queue job history, and add resolution fields to system_errors.
 */

export async function up(knex) {
  // 1. system_settings table
  const hasSettings = await knex.schema.hasTable('system_settings');
  if (!hasSettings) {
    await knex.schema.createTable('system_settings', (table) => {
      table.string('key', 100).primary();
      table.jsonb('value').notNullable();
      table.text('description').nullable();
      table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL').nullable();
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // 2. feature_flags table
  const hasFlags = await knex.schema.hasTable('feature_flags');
  if (!hasFlags) {
    await knex.schema.createTable('feature_flags', (table) => {
      table.string('key', 100).primary();
      table.boolean('is_enabled').notNullable().defaultTo(false);
      table.integer('rollout_percentage').notNullable().defaultTo(100);
      table.jsonb('environment_overrides').nullable();
      table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    });
  }

  // 3. slow_query_logs table
  const hasSlowQuery = await knex.schema.hasTable('slow_query_logs');
  if (!hasSlowQuery) {
    await knex.schema.createTable('slow_query_logs', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.text('query_text').notNullable();
      table.integer('duration_ms').notNullable();
      table.string('source_component', 100).notNullable();
      table.timestamp('executed_at').notNullable().defaultTo(knex.fn.now());

      table.index(['source_component', 'executed_at'], 'idx_slow_query_component_time');
    });
  }

  // 4. queue_job_history table
  const hasQueueHistory = await knex.schema.hasTable('queue_job_history');
  if (!hasQueueHistory) {
    await knex.schema.createTable('queue_job_history', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('job_type', 100).notNullable();
      table.string('queue_name', 50).notNullable().defaultTo('high');
      table.string('status', 50).notNullable().defaultTo('PENDING'); // PENDING, PROCESSING, COMPLETED, FAILED
      table.integer('attempts').notNullable().defaultTo(0);
      table.text('error_stack').nullable();
      table.jsonb('payload').nullable();
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('completed_at').nullable();

      table.index(['status', 'created_at'], 'idx_queue_job_status_time');
    });
  }

  // 5. Enhance system_errors table if column status doesn't exist
  const hasStatus = await knex.schema.hasColumn('system_errors', 'status');
  if (!hasStatus) {
    await knex.schema.alterTable('system_errors', (table) => {
      table.string('status', 20).notNullable().defaultTo('OPEN'); // OPEN, RESOLVED, IGNORED
      table.uuid('resolved_by').references('id').inTable('users').onDelete('SET NULL').nullable();
      table.timestamp('resolved_at').nullable();

      table.index(['status', 'occurred_at'], 'idx_system_errors_status_time');
    });
  }
}

export async function down(knex) {
  const hasStatus = await knex.schema.hasColumn('system_errors', 'status');
  if (hasStatus) {
    await knex.schema.alterTable('system_errors', (table) => {
      table.dropIndex(['status', 'occurred_at'], 'idx_system_errors_status_time');
      table.dropColumn('resolved_at');
      table.dropColumn('resolved_by');
      table.dropColumn('status');
    });
  }

  await knex.schema.dropTableIfExists('queue_job_history');
  await knex.schema.dropTableIfExists('slow_query_logs');
  await knex.schema.dropTableIfExists('feature_flags');
  await knex.schema.dropTableIfExists('system_settings');
}
