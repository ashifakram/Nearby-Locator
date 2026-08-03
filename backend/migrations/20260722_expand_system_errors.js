/**
 * Migration: Expand system_errors table with enterprise observability fields.
 */

export async function up(knex) {
  await knex.schema.alterTable('system_errors', (table) => {
    // Basic HTTP context
    table.string('method', 10);
    table.text('url');
    table.integer('status_code');
    table.string('ip_address', 45);
    
    // Tracing and correlation (request_id already exists from earlier migration)
    table.string('correlation_id', 100).index();
    
    // Identity context
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.uuid('admin_id').references('id').inTable('users').onDelete('SET NULL');
    
    // Observability enrichment
    table.string('severity', 20).defaultTo('ERROR').index();
    table.jsonb('context'); // Generic contextual payload
    table.string('environment', 50).defaultTo('production');
    table.string('app_version', 50);
    
    // Resolution lifecycle
    table.string('resolved_status', 20).defaultTo('OPEN').index();
    table.text('resolution_notes');

    // Rename 'error_message' to 'message' for standardisation (or keep it and add an alias)
    // Actually, knex allows renaming but the user explicitly said "Never rename columns if it breaks things"
    // I will just add 'message' or keep using 'error_message'. I'll keep 'error_message' but the repository should map it to 'message' in the API. Let's rename it since it's an internal table and we are refactoring observability, but the prompt says: "Never break existing data. Never remove existing columns. Never rewrite existing migrations. Create new forward-only migrations."
    // I will NOT rename error_message. I will just use `error_message` in the repository mapping!
  });
}

export async function down(knex) {
  await knex.schema.alterTable('system_errors', (table) => {
    table.dropColumns(
      'method', 'url', 'status_code', 'ip_address',
      'correlation_id', 'user_id', 'admin_id',
      'severity', 'context', 'environment', 'app_version',
      'resolved_status', 'resolution_notes'
    );
  });
}
