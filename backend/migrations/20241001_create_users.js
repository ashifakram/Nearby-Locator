/**
 * Migration: create users table with UUID primary key and audit columns.
 */

export async function up(knex) {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').notNullable().unique();
    table.string('password_hash'); // may be null for Google‑only accounts
    table.string('name');
    table.string('avatar_url');
    table.enu('provider', ['local', 'google']).notNullable().defaultTo('local');
    table.string('google_id').unique();
    table.enu('status', ['active', 'disabled']).notNullable().defaultTo('active');
    // audit columns
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
    table.uuid('created_by'); // optional reference to user who created the record
    table.uuid('updated_by'); // optional reference to user who last updated the record
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('users');
}
