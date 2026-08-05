/**
 * Migration: Create contact_submissions table
 * Stores all contact form submissions for admin review and support ticketing
 */
export async function up(knex) {
  await knex.schema.createTable('contact_submissions', (table) => {
    table.increments('id').primary();
    table.string('ticket_id', 20).notNullable().unique(); // e.g. NL-2024-00042
    table.string('name', 200).notNullable();
    table.string('email', 255).notNullable();
    table.string('category', 50).notNullable(); // general | technical | billing | privacy | partnerships
    table.string('subject', 500).notNullable();
    table.text('message').notNullable();
    table.string('status', 30).notNullable().defaultTo('open');
    // open | in_progress | resolved | closed | spam
    table.string('priority', 20).notNullable().defaultTo('normal');
    // low | normal | high | urgent
    table.string('assigned_to', 255).nullable(); // admin email
    table.text('admin_notes').nullable();
    table.string('ip_address', 45).nullable();
    table.string('user_agent', 500).nullable();
    table.boolean('confirmation_sent').notNullable().defaultTo(false);
    table.timestamp('resolved_at').nullable();
    table.timestamps(true, true);

    table.index('email');
    table.index('status');
    table.index('category');
    table.index('ticket_id');
    table.index('created_at');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('contact_submissions');
}
