import type { User, EmployeeProfile, Entry, AttendanceRecord, ReportItem, NotificationItem, DailyUpdate } from "@/types";
import { toDateStr, addDays } from "@/lib/utils";
import fs from "fs";
import path from "path";

interface MemoryStore {
  users: User[];
  employees: EmployeeProfile[];
  passwords: Record<string, string>;
  dailyUpdates: DailyUpdate[];
  activities: Array<{
    id: number;
    employeeId: number;
    date: string;
    type: string;
    quantity: number;
    country: string | null;
    accountId: string | null;
    ticketCategory: string | null;
    priority: string | null;
    status: string | null;
    description: string;
    createdAt: string;
  }>;
  attendance: AttendanceRecord[];
  notifications: NotificationItem[];
  reports: ReportItem[];
}

const globalForStore = globalThis as typeof globalThis & {
  __workpulseStore?: MemoryStore;
};

const DISK_FILE = path.join(process.cwd(), ".workpulse-local-data.json");

function loadFromDisk(): MemoryStore | null {
  try {
    if (fs.existsSync(DISK_FILE)) {
      const raw = fs.readFileSync(DISK_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Failed to load local store file:", e);
  }
  return null;
}

export function saveToDisk(store?: MemoryStore) {
  try {
    const s = store || getMemoryStore();
    fs.writeFileSync(DISK_FILE, JSON.stringify(s, null, 2), "utf8");
  } catch (e) {
    console.warn("Failed to save local store file:", e);
  }
}

export function getMemoryStore(): MemoryStore {
  if (globalForStore.__workpulseStore) {
    if (!globalForStore.__workpulseStore.dailyUpdates) globalForStore.__workpulseStore.dailyUpdates = [];
    if (!globalForStore.__workpulseStore.activities) globalForStore.__workpulseStore.activities = [];
    if (!globalForStore.__workpulseStore.attendance) globalForStore.__workpulseStore.attendance = [];
    if (!globalForStore.__workpulseStore.notifications) globalForStore.__workpulseStore.notifications = [];
    if (!globalForStore.__workpulseStore.reports) globalForStore.__workpulseStore.reports = [];
    return globalForStore.__workpulseStore;
  }

  // Check if saved state exists on local disk
  const disk = loadFromDisk();
  if (disk) {
    if (!disk.dailyUpdates) disk.dailyUpdates = [];
    if (!disk.activities) disk.activities = [];
    if (!disk.attendance) disk.attendance = [];
    if (!disk.notifications) disk.notifications = [];
    if (!disk.reports) disk.reports = [];
    globalForStore.__workpulseStore = disk;
    return disk;
  }

  // Start completely empty — no pre-seeded demo users.
  // The first user who registers will automatically be assigned the "admin" role.
  const store: MemoryStore = {
    users: [],
    employees: [],
    passwords: {},
    dailyUpdates: [],
    activities: [],
    attendance: [],
    notifications: [],
    reports: [],
  };

  globalForStore.__workpulseStore = store;
  return store;
}

/**
 * Determine the role for a new registrant.
 * - If the store is empty, the first user becomes the admin.
 * - All subsequent users are plain employees.
 * - Role can only be elevated by an existing admin via the Admin Hub (PATCH /api/admin/users).
 */
export function resolveNewUserRole(store: MemoryStore): "admin" | "employee" {
  return store.users.length === 0 ? "admin" : "employee";
}
