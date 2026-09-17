const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const sqlFile = path.join(__dirname, 'drizzle', '0000_safe_amazoness.sql');
const rawSql = fs.readFileSync(sqlFile, 'utf8');
const statements = rawSql
  .split('--> statement-breakpoint')
  .map(s => s.trim())
  .filter(Boolean);

const PROJECT_REF = 'udkvkxaiduugqgnesxjp';
const POOLER_HOST = 'aws-0-us-east-1.pooler.supabase.com';

async function runMigration(password) {
  console.log(`Connecting to Supabase (${POOLER_HOST}:6543)...`);
  const client = new Client({
    host: POOLER_HOST,
    port: 6543,
    database: 'postgres',
    user: `postgres.${PROJECT_REF}`,
    password: password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  await client.connect();
  console.log('\n✅ Connected to Supabase PostgreSQL!');
  console.log(`Running ${statements.length} migration statements...\n`);

  let ok = 0, skip = 0, fail = 0;
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt) continue;
    try {
      await client.query(stmt);
      const match = stmt.match(/CREATE TABLE "?(\w+)"?/i) || stmt.match(/ADD CONSTRAINT "?(\w+)"?/i);
      const label = match ? match[1] : `stmt ${i+1}`;
      console.log(`  ✓ ${label}`);
      ok++;
    } catch (err) {
      if (err.message.includes('already exists')) {
        const name = err.message.match(/"([^"]+)"/)?.[1] || '';
        console.log(`  ⚠ Already exists (skipped): ${name}`);
        skip++;
      } else {
        console.error(`  ✗ Error:`, err.message.split('\n')[0]);
        fail++;
      }
    }
  }

  await client.end();
  return { ok, skip, fail };
}

const pass = process.argv[2] || process.env.DB_PASSWORD || 'W36W7Hv?P8B2hdt';

runMigration(pass)
  .then(res => {
    console.log(`\n=============================================`);
    console.log(`✅ Migration complete! Created: ${res.ok}, Skipped: ${res.skip}, Errors: ${res.fail}`);
  })
  .catch(err => {
    console.error('\n❌ Connection failed:', err.message);
    process.exit(1);
  });
