export interface User {
  id: number;
  name: string;
  email: string;
  role: "employee" | "admin" | "manager";
  department: string;
  avatar?: string | null;
}

export interface DailyUpdate {
  id: number;
  userId: number;
  userName?: string;
  userRole?: string;
  department?: string;
  avatar?: string | null;
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

export interface ReportItem {
  id: number;
  userId: number;
  userName?: string;
  department?: string;
  avatar?: string | null;
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

export interface Attendance {
  id: number;
  userId: number;
  date: string;
  checkInTime: string;
  status: string;
  mood?: string | null;
  note?: string | null;
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

export interface EmployeeOverview {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar?: string | null;
  stats: {
    tickets: number;
    chats: number;
    kyc: number;
    calls: number;
    emails: number;
    trainingHours: number;
    entriesCount: number;
    performanceScore: number;
    todayLogged: boolean;
    attendanceStatus: string;
    checkInTime?: string | null;
  };
}
