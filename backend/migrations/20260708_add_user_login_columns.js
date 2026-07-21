export async function up(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.integer('failed_login_count').notNullable().defaultTo(0);
    table.timestamp('last_login_at').nullable();
  });
}

export async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('failed_login_count');
    table.dropColumn('last_login_at');
  });
}
