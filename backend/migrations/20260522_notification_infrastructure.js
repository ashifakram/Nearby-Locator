/**
 * Migration: Create notification, preferences, dead-letter jobs, and webhook delivery infrastructure.
 */

export async function up(knex) {
  // 1. Alter users table to add timezone column (explicit settings preferred for quiet-period math)
  const hasTimezone = await knex.schema.hasColumn('users', 'timezone');
  if (!hasTimezone) {
    await knex.schema.alterTable('users', (table) => {
      table.string('timezone', 50).notNullable().defaultTo('America/New_York');
    });
  }

  // 2. Create user_notification_preferences table
  await knex.schema.createTable('user_notification_preferences', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('channel', 50).notNullable();   // email, sms, push
    table.string('category', 100).notNullable(); // transactional, security, marketing
    table.boolean('is_enabled').notNullable().defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    // Unique preference key per user/channel/category combo
    table.unique(['user_id', 'channel', 'category']);
  });

  // 3. Create suppression_list table
  await knex.schema.createTable('suppression_list', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('type', 50).notNullable();        // email, phone
    table.string('target_value', 255).notNullable().unique(); // email address or phone number
    table.string('reason', 100).notNullable();    // bounce, spam_complaint, unsubscribe
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    table.index('target_value');
  });

  // 4. Create notification_deliveries table (acts as effectively-once idempotency lock)
  await knex.schema.createTable('notification_deliveries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('delivery_key', 255).notNullable().unique(); // event-specific idempotency hash
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('channel', 50).notNullable();
    table.string('category', 100).notNullable();
    table.string('target', 255).notNullable();
    table.string('status', 50).notNullable().defaultTo('pending'); // pending, delivered, failed
    table.text('error_details');
    table.string('provider', 100);
    table.integer('latency_ms');
    table.integer('retries').notNullable().defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    table.index('delivery_key');
    table.index('user_id');
  });

  // 5. Create webhook_subscriptions table (with circuit breaker properties)
  await knex.schema.createTable('webhook_subscriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('target_url', 2000).notNullable();
    table.text('event_types').notNullable(); // comma-separated strings or json list
    table.string('secret_key', 255).notNullable();
    table.string('status', 50).notNullable().defaultTo('active'); // active, disabled, paused
    table.integer('consecutive_failures').notNullable().defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();

    table.index('user_id');
  });

  // 6. Create webhook_deliveries table
  await knex.schema.createTable('webhook_deliveries', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('delivery_id').notNullable().unique(); // event-specific delivery idempotency ID
    table.uuid('subscription_id').notNullable().references('id').inTable('webhook_subscriptions').onDelete('CASCADE');
    table.string('event_type', 100).notNullable();
    table.string('status', 50).notNullable(); // success, failed
    table.integer('response_status');
    table.integer('latency_ms');
    table.integer('retries').notNullable().defaultTo(0);
    table.text('error_details');
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();

    table.index('delivery_id');
    table.index('subscription_id');
  });

  // 7. Create dead_letter_jobs table (forensic DB-backed DLQ to protect Redis memory)
  await knex.schema.createTable('dead_letter_jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('job_id').notNullable();
    table.string('type', 100).notNullable();
    table.jsonb('payload').notNullable(); // 2KB capped, PII-sanitized payload
    table.jsonb('error_details').notNullable();
    table.timestamp('failed_at').defaultTo(knex.fn.now()).notNullable();

    table.index('type');
    table.index('failed_at'); // supports 90-day automatic retention sweep index
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('dead_letter_jobs');
  await knex.schema.dropTableIfExists('webhook_deliveries');
  await knex.schema.dropTableIfExists('webhook_subscriptions');
  await knex.schema.dropTableIfExists('notification_deliveries');
  await knex.schema.dropTableIfExists('suppression_list');
  await knex.schema.dropTableIfExists('user_notification_preferences');

  const hasTimezone = await knex.schema.hasColumn('users', 'timezone');
  if (hasTimezone) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('timezone');
    });
  }
}
