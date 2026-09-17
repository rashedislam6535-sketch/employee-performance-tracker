import { pgTable, serial, text, timestamp, integer, date, numeric } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("employee"), // "employee" | "admin" | "manager"
  department: text("department").notNull().default("Customer Support"),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dailyUpdates = pgTable("daily_updates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  taskType: text("task_type").notNull(),
  description: text("description").notNull(),
  tickets: integer("tickets").notNull().default(0),
  chats: integer("chats").notNull().default(0),
  kyc: integer("kyc").notNull().default(0),
  calls: integer("calls").notNull().default(0),
  emails: integer("emails").notNull().default(0),
  trainingHours: numeric("training_hours", { precision: 4, scale: 2 }).notNull().default("0"),
  attachmentUrl: text("attachment_url"),
  attachmentName: text("attachment_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  weekStart: date("week_start").notNull(),
  weekEnd: date("week_end").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(), // JSON or Markdown string of weekly summary & AI analysis
  keyAchievements: text("key_achievements"),
  tasksInProgress: text("tasks_in_progress"),
  nextWeekPlan: text("next_week_plan"),
  metricsSnapshot: text("metrics_snapshot"), // JSON summary of tickets, chats, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attendanceCheckIns = pgTable("attendance_check_ins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  checkInTime: text("check_in_time").notNull(),
  status: text("status").notNull().default("present"), // present, remote, on_leave
  mood: text("mood"), // productive, energized, steady, tired
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"), // "achievement", "reminder", "system"
  isRead: integer("is_read").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------- Employee management (v2) ---------- */

// One profile per user. Holds personal information, photo and availability.
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  nickname: text("nickname"),
  photo: text("photo"), // data URL (resized on the client)
  dob: date("dob"),
  phone: text("phone"),
  bloodGroup: text("blood_group"),
  email: text("email"),
  department: text("department"),
  designation: text("designation"),
  employeeCode: text("employee_code"), // human-readable Employee ID
  availability: text("availability").notNull().default("available"), // available | busy | on_leave | offline
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// One row per employee per day. working_minutes = check_out - check_in - breaks.
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  checkIn: timestamp("check_in", { withTimezone: true }),
  checkOut: timestamp("check_out", { withTimezone: true }),
  workingMinutes: integer("working_minutes"),
  location: text("location"),
  device: text("device"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const breaks = pgTable("breaks", {
  id: serial("id").primaryKey(),
  attendanceId: integer("attendance_id").notNull().references(() => attendance.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  durationMinutes: integer("duration_minutes"),
});

// Structured activity log: KYC (quantity + country), tickets (MT account, category, priority, status),
// chats / calls / emails (quantity), training (hours), meetings and other.
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  type: text("type").notNull(), // kyc | ticket | chat | call | email | training | meeting | other
  quantity: numeric("quantity", { precision: 8, scale: 2 }).notNull().default("1"),
  country: text("country"),
  accountId: text("account_id"),
  ticketCategory: text("ticket_category"),
  priority: text("priority"),
  status: text("status"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
