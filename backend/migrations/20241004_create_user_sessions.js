// Migration: create user_sessions table with audit fields

export async function up(knex) {
  await knex.schema.createTable('user_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('session_token').notNullable();
    table.timestamp('expires_at').notNullable();
    // audit columns
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
    table.uuid('created_by');
    table.uuid('updated_by');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('user_sessions');
}
