/**
 * Migration: Create newsletter_subscribers table
 * Tracks all newsletter sign-ups with status management
 */
export async function up(knex) {
  await knex.schema.createTable('newsletter_subscribers', (table) => {
    table.increments('id').primary();
    table.string('email', 255).notNullable().unique();
    table.string('status', 20).notNullable().defaultTo('active');
    // active | unsubscribed
    table.string('source', 50).notNullable().defaultTo('landing_page');
    // landing_page | manual | import
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 500).nullable();
    table.boolean('confirmation_sent').notNullable().defaultTo(false);
    table.timestamp('confirmed_at').nullable();
    table.timestamp('unsubscribed_at').nullable();
    table.string('unsubscribe_token', 100).notNullable().unique();
    table.timestamps(true, true);

    table.index('email');
    table.index('status');
    table.index('created_at');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('newsletter_subscribers');
}
