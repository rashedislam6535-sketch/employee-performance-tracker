import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS "users" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "email" text NOT NULL,
    "password" text NOT NULL,
    "role" text DEFAULT 'employee' NOT NULL,
    "department" text DEFAULT 'Customer Support' NOT NULL,
    "avatar" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "users_email_unique" UNIQUE("email")
  )`,
  `CREATE TABLE IF NOT EXISTS "daily_updates" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "date" date NOT NULL,
    "task_type" text NOT NULL,
    "description" text NOT NULL,
    "tickets" integer DEFAULT 0 NOT NULL,
    "chats" integer DEFAULT 0 NOT NULL,
    "kyc" integer DEFAULT 0 NOT NULL,
    "calls" integer DEFAULT 0 NOT NULL,
    "emails" integer DEFAULT 0 NOT NULL,
    "training_hours" numeric(4, 2) DEFAULT '0' NOT NULL,
    "attachment_url" text,
    "attachment_name" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "daily_updates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action
  )`,
  `CREATE TABLE IF NOT EXISTS "reports" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "week_start" date NOT NULL,
    "week_end" date NOT NULL,
    "title" text NOT NULL,
    "content" text NOT NULL,
    "key_achievements" text,
    "tasks_in_progress" text,
    "next_week_plan" text,
    "metrics_snapshot" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action
  )`,
  `CREATE TABLE IF NOT EXISTS "attendance_check_ins" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "date" date NOT NULL,
    "check_in_time" text NOT NULL,
    "status" text DEFAULT 'present' NOT NULL,
    "mood" text,
    "note" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "attendance_check_ins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action
  )`,
  `CREATE TABLE IF NOT EXISTS "notifications" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "title" text NOT NULL,
    "message" text NOT NULL,
    "type" text DEFAULT 'info' NOT NULL,
    "is_read" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action
  )`
];

async function run() {
  console.log("Connecting to Supabase PostgreSQL...");
  for (const sql of SCHEMA_SQL) {
    await pool.query(sql);
  }
  console.log("✓ All 5 tables created successfully in Supabase!");

  // Check if owner user exists
  const ownerRes = await pool.query('SELECT * FROM "users" WHERE email = $1', ['me@workpulse.local']);
  if (ownerRes.rows.length === 0) {
    const ownerName = process.env.OWNER_NAME?.trim() || 'Rashed';
    const ownerDept = process.env.OWNER_DEPARTMENT?.trim() || 'Customer Support';
    const insertRes = await pool.query(
      'INSERT INTO "users" (name, email, password, role, department) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [ownerName, 'me@workpulse.local', 'not-used', 'employee', ownerDept]
    );
    const ownerId = insertRes.rows[0].id;
    console.log(`✓ Created default owner profile: ${ownerName} (${ownerDept}, ID: ${ownerId})`);

    await pool.query(
      'INSERT INTO "notifications" (user_id, title, message, type, is_read) VALUES ($1, $2, $3, $4, $5)',
      [ownerId, 'Welcome to WorkPulse', 'Your Supabase database is connected and active!', 'system', 0]
    );
  } else {
    console.log(`✓ Owner profile already exists: ${ownerRes.rows[0].name}`);
  }

  const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log("✓ Live tables in Supabase public schema:", res.rows.map(r => r.table_name));
  await pool.end();
}

run().catch((err) => {
  console.error("Database initialization error:", err);
  process.exit(1);
});
