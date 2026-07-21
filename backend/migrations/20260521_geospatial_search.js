/**
 * Migration: Create spots table with dynamic spatial support.
 * Safely queries PostgreSQL pg_available_extensions catalog to detect PostGIS.
 * - If available: Enables PostGIS and uses geography(Point, 4326).
 * - If unavailable: Gracefully falls back to native PostgreSQL point geometric type.
 */
export async function up(knex) {
  // 1. Detect PostGIS availability in a safe, non-transaction-aborting way
  let hasPostgis = false;
  try {
    const result = await knex.raw("SELECT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'postgis') AS postgis_available");
    hasPostgis = result.rows[0].postgis_available;
  } catch (err) {
    console.log('Error checking PostGIS availability, falling back to native point:', err.message);
  }

  // 2. Create spots table
  await knex.schema.createTable('spots', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.string('category', 100).notNullable();
    table.double('latitude').notNullable();
    table.double('longitude').notNullable();
    table.float('rating').defaultTo(0.0).notNullable();
    table.text('address').nullable();
    table.boolean('is_active').defaultTo(true).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
  });

  if (hasPostgis) {
    console.log('PostGIS extension available. Enabling and configuring geography(Point, 4326)...');
    await knex.raw('CREATE EXTENSION IF NOT EXISTS postgis');
    await knex.raw('ALTER TABLE spots ADD COLUMN coordinates geography(Point, 4326)');
    
    await knex.raw(`
      CREATE OR REPLACE FUNCTION update_spots_coordinates()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.coordinates := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await knex.raw(`
      CREATE TRIGGER trigger_update_spots_coordinates
      BEFORE INSERT OR UPDATE ON spots
      FOR EACH ROW
      EXECUTE FUNCTION update_spots_coordinates();
    `);

    await knex.raw('CREATE INDEX spots_active_coordinates_gist ON spots USING gist(coordinates) WHERE is_active = true');
  } else {
    console.log('PostGIS extension NOT available. Falling back to native PostgreSQL point geometric type.');
    // Native point format: (x, y) = (longitude, latitude)
    await knex.raw('ALTER TABLE spots ADD COLUMN coordinates point');

    await knex.raw(`
      CREATE OR REPLACE FUNCTION update_spots_coordinates()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.coordinates := point(NEW.longitude, NEW.latitude);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await knex.raw(`
      CREATE TRIGGER trigger_update_spots_coordinates
      BEFORE INSERT OR UPDATE ON spots
      FOR EACH ROW
      EXECUTE FUNCTION update_spots_coordinates();
    `);

    // Gist index on native point type is supported natively out of the box in PostgreSQL
    await knex.raw('CREATE INDEX spots_active_coordinates_gist ON spots USING gist(coordinates) WHERE is_active = true');
  }

  // Common indexes
  await knex.schema.alterTable('spots', (table) => {
    table.index(['category'], 'idx_spots_category');
    table.index(['is_active'], 'idx_spots_is_active');
  });
}

export async function down(knex) {
  await knex.raw('DROP INDEX IF EXISTS spots_active_coordinates_gist');
  await knex.raw('DROP TRIGGER IF EXISTS trigger_update_spots_coordinates ON spots');
  await knex.raw('DROP FUNCTION IF EXISTS update_spots_coordinates');
  await knex.schema.dropTableIfExists('spots');
}
