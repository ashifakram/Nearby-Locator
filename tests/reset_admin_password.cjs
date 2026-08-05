const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({ 
  connectionString: 'postgres://postgres:root@localhost:5432/nearby_locator' 
});

async function main() {
  const newPw = 'SuperAdmin@123';
  const hash = await bcrypt.hash(newPw, 12);
  const result = await pool.query(
    "UPDATE users SET password_hash=$1, status='ACTIVE' WHERE email=$2 RETURNING email, status",
    [hash, 'superadmin@nearby-dev.local']
  );
  console.log('Updated admin:', JSON.stringify(result.rows));
  
  // Verify login works
  const user = await pool.query(
    "SELECT email, password_hash, status FROM users WHERE email=$1",
    ['superadmin@nearby-dev.local']
  );
  const valid = await bcrypt.compare(newPw, user.rows[0].password_hash);
  console.log('Password verify:', valid, '| Status:', user.rows[0].status);
  
  await pool.end();
}

main().catch(e => { console.error(e.message); pool.end(); });
