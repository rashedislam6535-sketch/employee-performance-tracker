import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ---------- Constants ---------- */

export const TASK_TYPES = [
  "KYC Verification",
  "Customer Support",
  "HubSpot",
  "Ticket Handling",
  "Chat Support",
  "Phone Call",
  "Email",
  "Training",
  "Meeting",
  "Other",
];

export const TASK_COLORS: Record<string, string> = {
  "KYC Verification": "#10b981",
  "Customer Support": "#3b82f6",
  HubSpot: "#f97316",
  "Ticket Handling": "#6366f1",
  "Chat Support": "#14b8a6",
  "Phone Call": "#8b5cf6",
  Email: "#f59e0b",
  Training: "#ec4899",
  Meeting: "#64748b",
  Other: "#a1a1aa",
};

export function taskColor(taskType: string): string {
  return TASK_COLORS[taskType] || TASK_COLORS.Other;
}

// Structured activity types (activities table)
export const ACTIVITY_TYPES: { id: ActivityType; label: string; unit: string; hint: string }[] = [
  { id: "kyc", label: "KYC Verification", unit: "verifications", hint: "Number completed and country" },
  { id: "ticket", label: "Ticket Handling", unit: "ticket", hint: "MT account, category and priority" },
  { id: "chat", label: "Chat Support", unit: "chats", hint: "Number of chats handled" },
  { id: "call", label: "Phone Call", unit: "calls", hint: "Number of calls made" },
  { id: "email", label: "Email", unit: "emails", hint: "Number of emails sent" },
  { id: "training", label: "Training", unit: "hours", hint: "Hours spent on training" },
  { id: "meeting", label: "Meeting", unit: "hours", hint: "Team or client meeting" },
  { id: "other", label: "Other", unit: "items", hint: "Anything else" },
];
export type ActivityType = "kyc" | "ticket" | "chat" | "call" | "email" | "training" | "meeting" | "other";

export function activityLabel(type: string): string {
  return ACTIVITY_TYPES.find((t) => t.id === type)?.label ?? "Other";
}

// Maps legacy free-text task types (daily_updates) to activity types
export function taskTypeToActivityType(taskType: string): string {
  const map: Record<string, string> = {
    "KYC Verification": "kyc",
    "Ticket Handling": "ticket",
    "Chat Support": "chat",
    "Phone Call": "call",
    Email: "email",
    Training: "training",
    Meeting: "meeting",
    "Customer Support": "support",
    HubSpot: "hubspot",
  };
  return map[taskType] ?? "other";
}

export const KYC_COUNTRIES = ["Uzbekistan", "Bangladesh", "Vietnam", "Indonesia", "Thailand", "Other"];
export const TICKET_CATEGORIES = [
  "Scalping Check",
  "Account Violation",
  "Payment Issue",
  "Withdrawal Issue",
  "Trading Rule Question",
  "Platform Issue",
  "Other",
];
export const PRIORITIES = ["Low", "Medium", "High"] as const;
export const TICKET_STATUSES = ["Pending", "In Progress", "Resolved"] as const;
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const AVAILABILITY_OPTIONS = [
  { id: "available", label: "Available", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900" },
  { id: "busy", label: "Busy", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900" },
  { id: "on_leave", label: "On Leave", dot: "bg-sky-500", badge: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900" },
  { id: "offline", label: "Offline", dot: "bg-zinc-400", badge: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700" },
] as const;
export type Availability = (typeof AVAILABILITY_OPTIONS)[number]["id"];
export function availabilityMeta(id: string | null | undefined) {
  return AVAILABILITY_OPTIONS.find((a) => a.id === id) ?? AVAILABILITY_OPTIONS[0];
}

/* ---------- Daily targets & productivity ---------- */

export const DAILY_TARGETS = {
  tickets: 15,
  chats: 25,
  kyc: 8,
  calls: 15,
  emails: 15,
  trainingHours: 1,
} as const;

export type MetricKey = keyof typeof DAILY_TARGETS;
export const METRIC_KEYS: MetricKey[] = ["tickets", "chats", "kyc", "calls", "emails", "trainingHours"];

export const METRIC_LABELS: Record<MetricKey, string> = {
  tickets: "Tickets",
  chats: "Chats",
  kyc: "KYC",
  calls: "Calls",
  emails: "Emails",
  trainingHours: "Training",
};

export type Totals = Record<MetricKey, number>;

export function emptyTotals(): Totals {
  return { tickets: 0, chats: 0, kyc: 0, calls: 0, emails: 0, trainingHours: 0 };
}

export interface CategoryScore {
  key: MetricKey;
  label: string;
  completed: number;
  target: number;
  pct: number; // capped at 100
  rawPct: number; // uncapped
}

/** completed / daily target × 100 for each category. */
export function categoryScores(t: Partial<Record<MetricKey, number | string>>, days = 1): CategoryScore[] {
  return METRIC_KEYS.map((key) => {
    const completed = num(t[key]);
    const target = DAILY_TARGETS[key] * Math.max(1, days);
    const rawPct = Math.round((completed / target) * 100);
    return { key, label: METRIC_LABELS[key], completed, target, pct: Math.min(100, rawPct), rawPct };
  });
}

/** Overall productivity = average of all category percentages (each capped at 100). */
export function productivityScore(t: Partial<Record<MetricKey, number | string>>, days = 1): number {
  const scores = categoryScores(t, days);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, s) => a + s.pct, 0) / scores.length);
}

// Backwards-compatible name used by older components.
export const calculateProductivityScore = (t: Partial<Record<MetricKey, number | string>>) => productivityScore(t);

export function tasksCompleted(t: Partial<Record<MetricKey, number | string>>): number {
  return num(t.tickets) + num(t.chats) + num(t.kyc) + num(t.calls) + num(t.emails);
}

/* ---------- Dates (local time, never UTC) ---------- */

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Normalises whatever the database driver returns for a DATE column to "YYYY-MM-DD". */
export function dateKey(v: unknown): string {
  if (v instanceof Date) return toDateStr(v);
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    const d = new Date(v);
    return isNaN(d.getTime()) ? v : toDateStr(d);
  }
  return String(v ?? "").slice(0, 10);
}

export function parseDateStr(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function isWeekend(ds: string): boolean {
  const dow = parseDateStr(ds).getDay();
  return dow === 0 || dow === 6;
}

export function isWorkingDay(ds: string): boolean {
  return !isWeekend(ds);
}

/** Monday of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  return addDays(d, -((d.getDay() + 6) % 7));
}

/** Previous working day (skips Saturday/Sunday). */
export function previousWorkingDay(ds: string): string {
  let d = addDays(parseDateStr(ds), -1);
  while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, -1);
  return toDateStr(d);
}

export function workingDaysBetween(start: Date, end: Date): number {
  let n = 0;
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) n++;
  }
  return n;
}

/** Working days in a month: total, and elapsed up to `today` (inclusive). */
export function workingDaysInMonth(year: number, month: number, today = new Date()): { total: number; elapsed: number } {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const total = workingDaysBetween(first, last);
  const cutoff = today < first ? null : today > last ? last : today;
  const elapsed = cutoff ? workingDaysBetween(first, cutoff) : 0;
  return { total, elapsed };
}

export function formatDate(s: string): string {
  return parseDateStr(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatShortDate(s: string): string {
  return parseDateStr(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatLongDate(s: string): string {
  return parseDateStr(s).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function formatMonthYear(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function weekdayShort(s: string): string {
  return parseDateStr(s).toLocaleDateString("en-US", { weekday: "short" });
}

export function weekdayLong(s: string): string {
  return parseDateStr(s).toLocaleDateString("en-US", { weekday: "long" });
}

export function formatTime(v: string | Date | null | undefined): string {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

/** 465 → "7h 45m", 45 → "45m", 0 → "0m" */
export function formatDuration(minutes: number | null | undefined): string {
  const m = Math.max(0, Math.round(num(minutes)));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}m`;
}

/* ---------- Numbers ---------- */

export function num(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function summarizeMetrics(u: Partial<Record<MetricKey, number | string>>): string {
  const parts: string[] = [];
  if (num(u.tickets) > 0) parts.push(`${num(u.tickets)} tickets`);
  if (num(u.chats) > 0) parts.push(`${num(u.chats)} chats`);
  if (num(u.kyc) > 0) parts.push(`${num(u.kyc)} KYC`);
  if (num(u.calls) > 0) parts.push(`${num(u.calls)} calls`);
  if (num(u.emails) > 0) parts.push(`${num(u.emails)} emails`);
  if (num(u.trainingHours) > 0) parts.push(`${num(u.trainingHours)}h training`);
  return parts.join(" · ");
}

export function describeDevice(ua: string): string {
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Unknown OS";
  return `${browser} · ${os}`;
}

/* ---------- Files ---------- */

export function toCsv(rows: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columns.map((c) => escape(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => escape(r[c.key])).join(",")).join("\n");
  return `${header}\n${body}`;
}

export function downloadFile(filename: string, content: string | Blob, mime: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
