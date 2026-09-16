import { db } from "@/db";
import { users, dailyUpdates, reports, notifications } from "@/db/schema";
import { count, sql } from "drizzle-orm";
import { addDays, toDateStr } from "@/lib/utils";

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
];

let schemaReady = false;

export async function ensureSchema() {
  if (schemaReady) return;
  for (const statement of SCHEMA_SQL) {
    await db.execute(sql.raw(statement));
  }
  schemaReady = true;
}

/** Creates tables + the owner profile on an empty database. Demo entries only when SEED_DEMO_DATA=true. */
export async function ensureSeedData() {
  try {
    await ensureSchema();

    const userCount = await db.select({ val: count() }).from(users);
    if (userCount[0]?.val > 0) return;

    const ownerName = process.env.OWNER_NAME?.trim() || "Ahsan Habib";
    const ownerDepartment = process.env.OWNER_DEPARTMENT?.trim() || "Customer Support";
    const demo = process.env.SEED_DEMO_DATA === "true";

    const [me] = await db
      .insert(users)
      .values({
        name: ownerName,
        email: process.env.OWNER_EMAIL?.trim() || "me@workpulse.local",
        password: "not-used",
        role: "employee",
        department: ownerDepartment,
      })
      .returning();

    if (!demo) {
      await db.insert(notifications).values({
        userId: me.id,
        title: "Welcome to WorkPulse",
        message: "Log your first update from “New update”. Your name and department can be changed in Settings.",
        type: "system",
        isRead: 0,
      });
      return;
    }

    await seedDemoEntries(me.id);
  } catch (err) {
    console.error("Database setup error:", err);
  }
}

async function seedDemoEntries(userId: number) {
  const today = new Date();
  const d = (n: number) => toDateStr(addDays(today, -n));

  const entries = [
    { day: 0, taskType: "KYC Verification", description: "Reviewed pending KYC submissions; approved ID and address proofs, requested re-uploads for blurry documents.", tickets: 4, chats: 6, kyc: 8, calls: 2, emails: 3, trainingHours: "0" },
    { day: 0, taskType: "Customer Support", description: "Assisted customers regarding payout status, login problems and account verification questions.", tickets: 8, chats: 19, kyc: 0, calls: 5, emails: 3, trainingHours: "0" },
    { day: 1, taskType: "Ticket Handling", description: "Cleared the overnight ticket queue — mostly withdrawal delays and password resets.", tickets: 17, chats: 4, kyc: 0, calls: 3, emails: 6, trainingHours: "0" },
    { day: 1, taskType: "KYC Verification", description: "Processed tier-2 verifications and updated customer notes in HubSpot.", tickets: 0, chats: 0, kyc: 6, calls: 0, emails: 2, trainingHours: "0" },
    { day: 1, taskType: "Training", description: "Completed the AML refresher module.", tickets: 0, chats: 0, kyc: 0, calls: 0, emails: 0, trainingHours: "1" },
    { day: 2, taskType: "Chat Support", description: "Live chat coverage during the afternoon peak; onboarding questions and platform navigation.", tickets: 5, chats: 34, kyc: 3, calls: 1, emails: 2, trainingHours: "0" },
    { day: 3, taskType: "Phone Call", description: "Callbacks for customers whose accounts were locked after failed verification attempts.", tickets: 6, chats: 8, kyc: 5, calls: 18, emails: 4, trainingHours: "0" },
    { day: 4, taskType: "HubSpot", description: "Cleaned up contact records, tagged dispute cases and logged call outcomes.", tickets: 9, chats: 11, kyc: 4, calls: 6, emails: 12, trainingHours: "0" },
    { day: 4, taskType: "Meeting", description: "Weekly team sync — new payout SLA and escalation process.", tickets: 0, chats: 0, kyc: 0, calls: 0, emails: 0, trainingHours: "0.5" },
    { day: 5, taskType: "Customer Support", description: "Handled payout and deposit confirmation queries; escalated two cases to finance.", tickets: 12, chats: 22, kyc: 2, calls: 7, emails: 8, trainingHours: "0" },
    { day: 7, taskType: "KYC Verification", description: "Verification backlog from the weekend; sanctions and PEP screening for new accounts.", tickets: 3, chats: 5, kyc: 11, calls: 2, emails: 4, trainingHours: "0" },
    { day: 8, taskType: "Ticket Handling", description: "Resolved account access tickets and followed up on pending refunds.", tickets: 15, chats: 9, kyc: 2, calls: 4, emails: 7, trainingHours: "0" },
    { day: 9, taskType: "Chat Support", description: "Chat queue plus email follow-ups for unresolved cases.", tickets: 6, chats: 27, kyc: 1, calls: 2, emails: 9, trainingHours: "0" },
    { day: 10, taskType: "Phone Call", description: "Outbound calls to customers with incomplete KYC; guided them through the document upload flow.", tickets: 4, chats: 6, kyc: 7, calls: 16, emails: 3, trainingHours: "0" },
    { day: 11, taskType: "Customer Support", description: "General support shift; higher volume due to a payment provider outage.", tickets: 14, chats: 25, kyc: 2, calls: 8, emails: 6, trainingHours: "0" },
    { day: 11, taskType: "Training", description: "Fraud detection workshop.", tickets: 0, chats: 0, kyc: 0, calls: 0, emails: 0, trainingHours: "2" },
    { day: 14, taskType: "KYC Verification", description: "Routine verification queue and re-check of flagged documents.", tickets: 5, chats: 7, kyc: 9, calls: 3, emails: 5, trainingHours: "0" },
    { day: 15, taskType: "Ticket Handling", description: "Ticket backlog after the weekend; mostly payout timing questions.", tickets: 18, chats: 6, kyc: 1, calls: 5, emails: 8, trainingHours: "0" },
    { day: 16, taskType: "Chat Support", description: "Live chat coverage and follow-up emails.", tickets: 7, chats: 29, kyc: 2, calls: 2, emails: 10, trainingHours: "0" },
  ];

  await db.insert(dailyUpdates).values(
    entries.map((e) => ({
      userId,
      date: d(e.day),
      taskType: e.taskType,
      description: e.description,
      tickets: e.tickets,
      chats: e.chats,
      kyc: e.kyc,
      calls: e.calls,
      emails: e.emails,
      trainingHours: e.trainingHours,
    }))
  );

  await db.insert(reports).values({
    userId,
    weekStart: d(13),
    weekEnd: d(7),
    title: `Weekly report · ${d(13)} to ${d(7)}`,
    content:
      "Logged 8 updates across 6 days. Main areas of work: Customer Support, KYC Verification, Ticket Handling. Average daily productivity score: 78%.",
    keyAchievements:
      "✓ Completed 32 KYC verifications\n✓ Assisted 99 customers over live chat\n✓ Resolved 56 support tickets\n✓ Handled 42 customer phone calls\n✓ Completed 2.0 hours of training\n✓ Logged work on 6 days this period",
    tasksInProgress:
      "• Open customer cases waiting on customer replies\n• Pending KYC submissions awaiting document re-upload from customers\n• Escalated tickets awaiting resolution from other teams",
    nextWeekPlan:
      "• Keep KYC verifications at 5+ per day with no backlog\n• Close 9+ tickets per day within SLA\n• Complete all scheduled callbacks (7+ calls per day)\n• Log a work update every working day",
    metricsSnapshot: JSON.stringify({
      totalTickets: 56,
      totalChats: 99,
      totalKyc: 32,
      totalCalls: 42,
      totalEmails: 42,
      trainingHours: 2,
      updatesLogged: 8,
      daysLogged: 6,
      averageScore: 78,
    }),
  });

  await db.insert(notifications).values([
    {
      userId,
      title: "Sample data loaded",
      message: "These entries are examples. Remove them from Settings → Data → Delete all entries when you start tracking for real.",
      type: "system",
      isRead: 0,
    },
    {
      userId,
      title: "Weekly report ready",
      message: "Last week's report has been generated. Review and download it from Reports.",
      type: "system",
      isRead: 1,
    },
  ]);
}
