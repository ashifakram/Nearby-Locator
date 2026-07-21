/**
 * Migration: create system_errors table to store unhandled errors.
 */

export async function up(knex) {
  await knex.schema.createTable('system_errors', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('error_message').notNullable();
    table.text('stack_trace');
    table.timestamp('occurred_at').defaultTo(knex.fn.now()).notNullable();
    // audit fields
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
    table.uuid('created_by');
    table.uuid('updated_by');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('system_errors');
}
