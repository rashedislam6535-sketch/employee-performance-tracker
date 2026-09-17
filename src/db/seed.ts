import { db } from "@/db";
import { users, notifications, employees } from "@/db/schema";
import { count, sql } from "drizzle-orm";

/**
 * Creates the tables if they don't exist yet. Mirrors src/db/schema.ts, so a brand-new
 * database (Supabase, Neon, Docker…) works on the first request without running migrations.
 * `npx drizzle-kit push` remains the way to apply future schema changes.
 */
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
  )`,
  `CREATE TABLE IF NOT EXISTS "employees" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "name" text NOT NULL,
    "nickname" text,
    "photo" text,
    "dob" date,
    "phone" text,
    "blood_group" text,
    "email" text,
    "department" text,
    "designation" text,
    "employee_code" text,
    "availability" text DEFAULT 'available' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "employees_user_id_unique" UNIQUE("user_id"),
    CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action
  )`,
  `CREATE TABLE IF NOT EXISTS "attendance" (
    "id" serial PRIMARY KEY NOT NULL,
    "employee_id" integer NOT NULL,
    "date" date NOT NULL,
    "check_in" timestamp with time zone,
    "check_out" timestamp with time zone,
    "working_minutes" integer,
    "location" text,
    "device" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "attendance_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE cascade ON UPDATE no action
  )`,
  `CREATE TABLE IF NOT EXISTS "breaks" (
    "id" serial PRIMARY KEY NOT NULL,
    "attendance_id" integer NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone,
    "duration_minutes" integer,
    CONSTRAINT "breaks_attendance_id_attendance_id_fk" FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE cascade ON UPDATE no action
  )`,
  `CREATE TABLE IF NOT EXISTS "activities" (
    "id" serial PRIMARY KEY NOT NULL,
    "employee_id" integer NOT NULL,
    "date" date NOT NULL,
    "type" text NOT NULL,
    "quantity" numeric(8, 2) DEFAULT '1' NOT NULL,
    "country" text,
    "account_id" text,
    "ticket_category" text,
    "priority" text,
    "status" text,
    "description" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "activities_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE cascade ON UPDATE no action
  )`,
];

let schemaReady = false;

export async function ensureSchema() {
  if (schemaReady) return;
  for (const statement of SCHEMA_SQL) {
    await db.execute(sql.raw(statement));
  }
  schemaReady = true;
}

/** Creates the tables and a single blank profile on an empty database. No sample data is ever inserted. */
export async function ensureSeedData() {
  try {
    await ensureSchema();

    const userCount = await db.select({ val: count() }).from(users);
    if (userCount[0]?.val > 0) return;

    const ownerName = process.env.OWNER_NAME?.trim() || "Your Name";
    const ownerDepartment = process.env.OWNER_DEPARTMENT?.trim() || "";
    const ownerEmail = process.env.OWNER_EMAIL?.trim() || "me@workpulse.local";

    const [me] = await db
      .insert(users)
      .values({
        name: ownerName,
        email: ownerEmail,
        password: "not-used",
        role: "employee",
        department: ownerDepartment || "General",
      })
      .returning();

    await db.insert(employees).values({
      userId: me.id,
      name: ownerName,
      email: ownerEmail,
      department: ownerDepartment || null,
    });

    await db.insert(notifications).values({
      userId: me.id,
      title: "Welcome to WorkPulse",
      message: "Start by setting your name and photo on the Profile page, then check in and log your first activity.",
      type: "system",
      isRead: 0,
    });
  } catch (err) {
    console.error("Database setup error:", err);
  }
}
