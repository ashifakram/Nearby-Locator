/**
 * Migration: Create trust and moderation tables, and add moderation flags to spots and users.
 */
export async function up(knex) {
  // 1. Alter spots table
  await knex.schema.alterTable('spots', (table) => {
    table.string('moderation_status', 50).defaultTo('APPROVED').notNullable();
    table.double('trust_score').defaultTo(1.0).notNullable();
    table.timestamp('quarantined_at').nullable();
    table.boolean('suspicious_telemetry_flag').defaultTo(false).notNullable();
    table.uuid('creator_id').references('id').inTable('users').onDelete('SET NULL').nullable();

    table.index(['moderation_status']);
    table.index(['trust_score']);
  });

  // 2. Alter users table
  await knex.schema.alterTable('users', (table) => {
    table.double('trust_score').defaultTo(0.5).notNullable();
    table.timestamp('last_recovery_at').nullable();
  });

  // 3. Create reports table
  await knex.schema.createTable('reports', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('reporter_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.uuid('spot_id').references('id').inTable('spots').onDelete('CASCADE').notNullable();
    table.string('category', 100).notNullable();
    table.text('details').nullable();
    table.string('ip_address', 45).notNullable();
    table.string('status', 50).defaultTo('PENDING').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Prevent duplicate active/inactive report submissions per user per spot
    table.unique(['reporter_id', 'spot_id']);
    table.index(['created_at']);
    table.index(['spot_id']);
    table.index(['status']);
  });

  // 4. Create moderation_appeals table
  await knex.schema.createTable('moderation_appeals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('spot_id').references('id').inTable('spots').onDelete('CASCADE').notNullable();
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
    table.text('details').notNullable();
    table.string('status', 50).defaultTo('PENDING').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    table.index(['spot_id']);
    table.index(['status']);
  });

  // 5. Create spot_moderation_history table
  await knex.schema.createTable('spot_moderation_history', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('spot_id').references('id').inTable('spots').onDelete('CASCADE').notNullable();
    table.uuid('moderator_id').references('id').inTable('users').onDelete('SET NULL').nullable();
    table.string('action', 100).notNullable();
    table.text('reason').notNullable();
    table.text('notes').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    table.index(['spot_id']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('spot_moderation_history');
  await knex.schema.dropTableIfExists('moderation_appeals');
  await knex.schema.dropTableIfExists('reports');

  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('trust_score');
    table.dropColumn('last_recovery_at');
  });

  await knex.schema.alterTable('spots', (table) => {
    table.dropColumn('moderation_status');
    table.dropColumn('trust_score');
    table.dropColumn('quarantined_at');
    table.dropColumn('suspicious_telemetry_flag');
    table.dropColumn('creator_id');
  });
}
