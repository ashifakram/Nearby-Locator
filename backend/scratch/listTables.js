import db from '../db.js';

async function listTables() {
  try {
    const res = await db.raw("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log('TABLES:', res.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

listTables();
