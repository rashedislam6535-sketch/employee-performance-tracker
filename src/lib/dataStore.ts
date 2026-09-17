import type { User, EmployeeProfile, Entry, AttendanceRecord, ReportItem, NotificationItem } from "@/types";
import { toDateStr, addDays } from "@/lib/utils";

interface MemoryStore {
  users: User[];
  employees: EmployeeProfile[];
  passwords: Record<string, string>;
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

export function getMemoryStore(): MemoryStore {
  if (globalForStore.__workpulseStore) return globalForStore.__workpulseStore;

  // Start completely empty — no pre-seeded demo users.
  // The first user who registers will automatically be assigned the "admin" role.
  const store: MemoryStore = {
    users: [],
    employees: [],
    passwords: {},
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
