/**
 * Migration: create login_attempts table to track failed/successful login attempts.
 */

export async function up(knex) {
  await knex.schema.createTable('login_attempts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').notNullable();
    table.string('ip_address');
    table.string('country');
    table.boolean('is_successful').notNullable();
    table.string('failure_reason');
    table.timestamp('attempted_at').defaultTo(knex.fn.now()).notNullable();
    // audit columns
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
    table.uuid('created_by');
    table.uuid('updated_by');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('login_attempts');
}
