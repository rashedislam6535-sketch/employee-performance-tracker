import type { MetricKey, Totals } from "@/lib/utils";

export interface User {
  id: number;
  name: string;
  email: string;
  role: "employee" | "admin" | "manager";
  department: string;
  avatar?: string | null;
}

export interface EmployeeProfile {
  id: number;
  userId: number;
  name: string;
  nickname: string | null;
  photo: string | null;
  dob: string | null;
  phone: string | null;
  bloodGroup: string | null;
  email: string | null;
  department: string | null;
  designation: string | null;
  employeeCode: string | null;
  availability: string;
}

/** Legacy bulk daily update row (daily_updates table). Still supported. */
export interface DailyUpdate {
  id: number;
  userId: number;
  userName?: string;
  date: string;
  taskType: string;
  description: string;
  tickets: number;
  chats: number;
  kyc: number;
  calls: number;
  emails: number;
  trainingHours: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt?: string;
}

/** Normalised log entry — comes from either daily_updates (source "update") or activities (source "activity"). */
export interface Entry extends Totals {
  id: string;
  source: "update" | "activity";
  rawId: number;
  date: string;
  type: string;
  label: string;
  description: string;
  quantity: number | null;
  country: string | null;
  accountId: string | null;
  ticketCategory: string | null;
  priority: string | null;
  status: string | null;
  attachmentName: string | null;
  createdAt: string;
}

export interface BreakRecord {
  id: number;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
  ongoing: boolean;
}

export type AttendanceStatus = "not_checked_in" | "working" | "on_break" | "checked_out";

export interface AttendanceRecord {
  id: number;
  employeeId?: number;
  userId?: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  location: string | null;
  device: string | null;
  breaks: BreakRecord[];
  breakMinutes: number;
  workingMinutes: number;
  onBreak: boolean;
  status: AttendanceStatus;
}

export interface ReportItem {
  id: number;
  userId: number;
  weekStart: string;
  weekEnd: string;
  title: string;
  content: string;
  keyAchievements?: string | null;
  tasksInProgress?: string | null;
  nextWeekPlan?: string | null;
  metricsSnapshot?: string | null;
  createdAt: string;
}

export interface NotificationItem {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: number;
  createdAt: string;
}

export interface DayPoint extends Totals {
  date: string;
  count: number;
  total: number;
  score: number;
  hasData: boolean;
  weekend: boolean;
}

export interface DashboardData {
  user: User;
  employee: EmployeeProfile;
  todayDate: string;
  isWeekend: boolean;
  today: Totals & { count: number; hasData: boolean; tasksCompleted: number; score: number };
  previous: Totals & { date: string; label: string; hasData: boolean; count: number };
  series: DayPoint[];
  week: { date: string; label: string; tickets: number; chats: number; kyc: number; calls: number; emails: number }[];
  weekTotals: { thisWeek: number; lastWeek: number };
  month: Totals & {
    label: string;
    count: number;
    daysLogged: number;
    workingDaysTotal: number;
    workingDaysElapsed: number;
    attendanceDays: number;
    attendancePct: number;
    workingMinutes: number;
    avgScore: number;
  };
  taskDistribution: { label: string; count: number }[];
  streak: number;
  recentEntries: Entry[];
  attendance: AttendanceRecord | null;
  notifications: NotificationItem[];
}

export type { MetricKey, Totals };
