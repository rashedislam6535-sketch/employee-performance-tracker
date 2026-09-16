import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

// Daily targets used for the productivity score and progress bars.
export const DAILY_TARGETS = {
  tickets: 15,
  chats: 25,
  kyc: 8,
  calls: 15,
  emails: 15,
  trainingHours: 1,
};

export const METRIC_LABELS: Record<keyof typeof DAILY_TARGETS, string> = {
  tickets: "Tickets",
  chats: "Chats",
  kyc: "KYC",
  calls: "Calls",
  emails: "Emails",
  trainingHours: "Training",
};

/* ---------- Dates (local time, never UTC) ---------- */

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

export function formatDate(s: string): string {
  return parseDateStr(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatShortDate(s: string): string {
  return parseDateStr(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatLongDate(s: string): string {
  return parseDateStr(s).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonthYear(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function weekdayShort(s: string): string {
  return parseDateStr(s).toLocaleDateString("en-US", { weekday: "short" });
}

/* ---------- Numbers ---------- */

export function num(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function calculateProductivityScore(item: {
  tickets?: number | string;
  chats?: number | string;
  kyc?: number | string;
  calls?: number | string;
  emails?: number | string;
  trainingHours?: number | string;
}): number {
  const t = num(item.tickets);
  const c = num(item.chats);
  const k = num(item.kyc);
  const ca = num(item.calls);
  const e = num(item.emails);
  const tr = num(item.trainingHours);
  if (t + c + k + ca + e + tr === 0) return 0;

  const part = (v: number, target: number, weight: number) => Math.min(1.2, v / target) * weight;
  const total =
    part(t, DAILY_TARGETS.tickets, 25) +
    part(c, DAILY_TARGETS.chats, 25) +
    part(k, DAILY_TARGETS.kyc, 20) +
    part(ca, DAILY_TARGETS.calls, 15) +
    part(e, DAILY_TARGETS.emails, 10) +
    part(tr, DAILY_TARGETS.trainingHours, 5);
  return Math.max(0, Math.min(100, Math.round(total)));
}

// "5 tickets · 8 KYC · 1.5h training"
export function summarizeMetrics(u: {
  tickets?: number;
  chats?: number;
  kyc?: number;
  calls?: number;
  emails?: number;
  trainingHours?: number | string;
}): string {
  const parts: string[] = [];
  if (num(u.tickets) > 0) parts.push(`${u.tickets} tickets`);
  if (num(u.chats) > 0) parts.push(`${u.chats} chats`);
  if (num(u.kyc) > 0) parts.push(`${u.kyc} KYC`);
  if (num(u.calls) > 0) parts.push(`${u.calls} calls`);
  if (num(u.emails) > 0) parts.push(`${u.emails} emails`);
  if (num(u.trainingHours) > 0) parts.push(`${num(u.trainingHours)}h training`);
  return parts.join(" · ");
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

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
