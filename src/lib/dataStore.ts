import { DEMO_USERS } from "@/lib/auth";
import type { User, EmployeeProfile, Entry, AttendanceRecord, ReportItem, NotificationItem } from "@/types";
import { toDateStr, addDays, num, emptyTotals, activityLabel } from "@/lib/utils";

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

  const today = new Date();
  const todayStr = toDateStr(today);
  const yestStr = toDateStr(addDays(today, -1));
  const twoDaysAgoStr = toDateStr(addDays(today, -2));
  const threeDaysAgoStr = toDateStr(addDays(today, -3));

  const users: User[] = DEMO_USERS.map((d) => d.user);
  const employees: EmployeeProfile[] = DEMO_USERS.map((d) => d.employee);
  const passwords: Record<string, string> = {};
  DEMO_USERS.forEach((d) => {
    passwords[d.user.email.toLowerCase()] = d.password;
  });

  const activities: MemoryStore["activities"] = [
    // Today's activities
    {
      id: 1,
      employeeId: 2,
      date: todayStr,
      type: "ticket",
      quantity: 1,
      country: null,
      accountId: "489201",
      ticketCategory: "Deposit Issue",
      priority: "High",
      status: "Resolved",
      description: "Assisted client with urgent card payment gateway issue.",
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 2,
      employeeId: 2,
      date: todayStr,
      type: "chat",
      quantity: 14,
      country: null,
      accountId: null,
      ticketCategory: null,
      priority: null,
      status: null,
      description: "Live chat queue handling during European market open session.",
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 3,
      employeeId: 3,
      date: todayStr,
      type: "kyc",
      quantity: 18,
      country: "United Kingdom",
      accountId: null,
      ticketCategory: null,
      priority: null,
      status: null,
      description: "High priority tier-2 account verification checks processed.",
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 4,
      employeeId: 4,
      date: todayStr,
      type: "call",
      quantity: 12,
      country: null,
      accountId: null,
      ticketCategory: null,
      priority: null,
      status: null,
      description: "VIP onboarding and technical configuration walk-throughs.",
      createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    },
    // Past days for rich charts
    {
      id: 5,
      employeeId: 2,
      date: yestStr,
      type: "ticket",
      quantity: 8,
      country: null,
      accountId: "109283",
      ticketCategory: "Technical Error",
      priority: "Medium",
      status: "Closed",
      description: "Handled ticket batch for mobile app connectivity.",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 6,
      employeeId: 2,
      date: yestStr,
      type: "email",
      quantity: 24,
      country: null,
      accountId: null,
      ticketCategory: null,
      priority: null,
      status: null,
      description: "Processed tier-1 support inbox queue.",
      createdAt: new Date(Date.now() - 86400000 + 7200000).toISOString(),
    },
    {
      id: 7,
      employeeId: 2,
      date: twoDaysAgoStr,
      type: "training",
      quantity: 2,
      country: null,
      accountId: null,
      ticketCategory: null,
      priority: null,
      status: null,
      description: "Attended Security Compliance & AML workshop.",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 8,
      employeeId: 3,
      date: yestStr,
      type: "kyc",
      quantity: 26,
      country: "Germany",
      accountId: null,
      ticketCategory: null,
      priority: null,
      status: null,
      description: "Automated identity screening validation & proof of address.",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 9,
      employeeId: 4,
      date: yestStr,
      type: "call",
      quantity: 16,
      country: null,
      accountId: null,
      ticketCategory: null,
      priority: null,
      status: null,
      description: "Quarterly review calls with enterprise accounts.",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  // Seed sample attendance
  const attendance: AttendanceRecord[] = [
    {
      id: 101,
      date: todayStr,
      checkIn: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 45).toISOString(),
      checkOut: null,
      location: "Headquarters (Floor 4)",
      device: "MacBook Pro / Chrome",
      breaks: [
        {
          id: 1,
          startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0).toISOString(),
          endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 45).toISOString(),
          durationMinutes: 45,
          ongoing: false,
        },
      ],
      breakMinutes: 45,
      workingMinutes: 280,
      onBreak: false,
      status: "working",
    },
    {
      id: 102,
      date: yestStr,
      checkIn: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 9, 0).toISOString(),
      checkOut: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 17, 30).toISOString(),
      location: "Remote (Home Office)",
      device: "Desktop / Firefox",
      breaks: [
        {
          id: 2,
          startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 13, 0).toISOString(),
          endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 13, 50).toISOString(),
          durationMinutes: 50,
          ongoing: false,
        },
      ],
      breakMinutes: 50,
      workingMinutes: 460,
      onBreak: false,
      status: "checked_out",
    },
  ];

  const notifications: NotificationItem[] = [
    {
      id: 1,
      userId: 1,
      title: "Welcome to WorkPulse Enterprise",
      message: "Admin Sector activated. You have full oversight over all team members, live attendance, and productivity reports.",
      type: "system",
      isRead: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      userId: 2,
      title: "Weekly Target Milestone",
      message: "Great job! You achieved 98% of your weekly ticket resolution and chat response SLA targets.",
      type: "achievement",
      isRead: 0,
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 3,
      userId: 3,
      title: "KYC Queue Update",
      message: "12 new high priority compliance documents have been assigned to your verification queue.",
      type: "reminder",
      isRead: 0,
      createdAt: new Date(Date.now() - 3600000 * 10).toISOString(),
    },
  ];

  const reports: ReportItem[] = [];

  const store: MemoryStore = {
    users,
    employees,
    passwords,
    activities,
    attendance,
    notifications,
    reports,
  };

  globalForStore.__workpulseStore = store;
  return store;
}
