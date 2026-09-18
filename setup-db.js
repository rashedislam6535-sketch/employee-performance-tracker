const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const sqlFile = path.join(__dirname, 'drizzle', '0000_safe_amazoness.sql');
const rawSql = fs.readFileSync(sqlFile, 'utf8');
const statements = rawSql
  .split('--> statement-breakpoint')
  .map((s) => s.trim())
  .filter(Boolean);

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'mkmrifjcczeohsppqhni';
const POOLER_HOST = process.env.SUPABASE_POOLER_HOST || 'aws-0-ap-northeast-1.pooler.supabase.com';

function updateEnvFile(password) {
  const envPath = path.join(__dirname, '.env');
  const encodedPass = encodeURIComponent(password);
  const newUrl = `postgresql://postgres.${PROJECT_REF}:${encodedPass}@${POOLER_HOST}:6543/postgres`;

  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    if (/DATABASE_URL=.*/.test(envContent)) {
      envContent = envContent.replace(/DATABASE_URL=.*/, `DATABASE_URL="${newUrl}"`);
    } else {
      envContent += `\nDATABASE_URL="${newUrl}"\n`;
    }
  } else {
    envContent = `DATABASE_URL="${newUrl}"\nOWNER_NAME="Rashed Islam"\nOWNER_DEPARTMENT="Operations & Leadership"\nOWNER_EMAIL="me@workpulse.local"\n`;
  }

  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log(`[setup-db] Updated .env with new DATABASE_URL.`);
}

async function runMigration(password) {
  console.log(`\n======================================================`);
  console.log(`🚀 WorkPulse Supabase Database Migration Tool`);
  console.log(`Host: ${POOLER_HOST}:6543 (Transaction Pooler)`);
  console.log(`Tenant: postgres.${PROJECT_REF}`);
  console.log(`======================================================\n`);

  const client = new Client({
    host: POOLER_HOST,
    port: 6543,
    database: 'postgres',
    user: `postgres.${PROJECT_REF}`,
    password: password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });

  await client.connect();
  console.log('✅ Successfully connected to Supabase PostgreSQL!\n');

  // Update .env file with confirmed working password
  updateEnvFile(password);

  console.log(`Applying ${statements.length} migration statements from drizzle schema...\n`);

  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt) continue;
    try {
      await client.query(stmt);
      const match =
        stmt.match(/CREATE TABLE "?(\w+)"?/i) ||
        stmt.match(/ADD CONSTRAINT "?(\w+)"?/i);
      const label = match ? match[1] : `statement ${i + 1}`;
      console.log(`  ✓ Created / Verified: ${label}`);
      ok++;
    } catch (err) {
      if (
        err.message.includes('already exists') ||
        err.message.includes('already defined')
      ) {
        const name = err.message.match(/"([^"]+)"/)?.[1] || '';
        console.log(`  ⚠ Exists (skipped): ${name}`);
        skip++;
      } else {
        console.error(`  ✗ Notice on statement ${i + 1}:`, err.message.split('\n')[0]);
        fail++;
      }
    }
  }

  // Verify all tables
  const tablesRes = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  const existingTables = tablesRes.rows.map((r) => r.table_name);
  console.log(`\nVerified live tables in Supabase public schema (${existingTables.length} total):`);
  console.log(existingTables.map((t) => `  - ${t}`).join('\n'));

  await client.end();
  return { ok, skip, fail, tables: existingTables };
}

const inputPass = process.argv[2] || process.env.DB_PASSWORD || 'W36W7Hv?P8B2hdt';

runMigration(inputPass)
  .then((res) => {
    console.log(`\n======================================================`);
    console.log(`✅ Migration complete! Created: ${res.ok}, Skipped/Existing: ${res.skip}, Errors: ${res.fail}`);
    console.log(`======================================================\n`);
  })
  .catch((err) => {
    console.error(`\n❌ Supabase connection failed: ${err.message}`);
    console.log(`\nTo connect Supabase:`);
    console.log(`1. Open https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database`);
    console.log(`2. If the project is paused, click "Restore project".`);
    console.log(`3. Under "Database password", click "Reset password".`);
    console.log(`4. Run: node setup-db.js "YOUR_NEW_PASSWORD"`);
    process.exit(1);
  });
