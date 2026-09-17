"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { User, NotificationItem, EmployeeProfile } from "@/types";
import { toDateStr } from "@/lib/utils";
import { DEMO_USERS } from "@/lib/auth";

type Theme = "light" | "dark";

export type ToastVariant = "default" | "success" | "error";
export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
  employee: EmployeeProfile | null;
  setEmployee: (e: EmployeeProfile) => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  authLoading: boolean;
  login: (credentials: { email: string; password?: string; role?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchUser: (userId: number) => Promise<void>;
  availableAccounts: Array<{ user: User; employee: EmployeeProfile }>;
  notifications: NotificationItem[];
  unreadCount: number;
  markNotificationAsRead: (id: number) => void;
  markAllRead: () => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  streakCount: number;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  refreshData: () => Promise<void>;
  dataVersion: number;
  notifyDataChanged: () => void;
  // feedback
  toasts: ToastItem[];
  toast: (opts: { title: string; description?: string; variant?: ToastVariant }) => void;
  dismissToast: (id: number) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  confirmState: { options: ConfirmOptions; resolve: (v: boolean) => void } | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const READ_KEY = "workpulse_read_notifications";
const AUTH_KEY = "workpulse_auth_session";

function applyThemeClass(t: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", t === "dark");
  root.style.colorScheme = t;
}

function loadReadIds(): number[] {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) || "[]");
  } catch {
    return [];
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [theme, setThemeState] = useState<Theme>("light");
  const [streakCount, setStreakCount] = useState(0);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [dataVersion, setDataVersion] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<AppContextType["confirmState"]>(null);
  const toastId = useRef(0);

  // Available accounts from DEMO_USERS
  const availableAccounts = DEMO_USERS.map((d) => ({
    user: d.user,
    employee: d.employee,
  }));

  const dismissToast = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (opts: { title: string; description?: string; variant?: ToastVariant }) => {
      const id = ++toastId.current;
      setToasts((prev) => [...prev.slice(-3), { id, title: opts.title, description: opts.description, variant: opts.variant ?? "default" }]);
      setTimeout(() => dismissToast(id), opts.variant === "error" ? 6000 : 3500);
    },
    [dismissToast]
  );

  // Restore Theme
  useEffect(() => {
    try {
      const saved = localStorage.getItem("workpulse_theme") as Theme | null;
      if (saved === "dark" || saved === "light") {
        setThemeState(saved);
        applyThemeClass(saved);
      } else {
        const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setThemeState(sysDark ? "dark" : "light");
        applyThemeClass(sysDark ? "dark" : "light");
      }
    } catch {
      setThemeState("light");
    }
  }, []);

  // Restore Auth Session
  useEffect(() => {
    try {
      const sessionRaw = localStorage.getItem(AUTH_KEY);
      if (sessionRaw) {
        const session = JSON.parse(sessionRaw);
        if (session && session.user) {
          setCurrentUser(session.user);
          if (session.employee) setEmployee(session.employee);
        }
      }
    } catch (e) {
      console.warn("Session restore error:", e);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyThemeClass(t);
    try {
      localStorage.setItem("workpulse_theme", t);
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);

  const currentUserId = currentUser?.id;

  const refreshData = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const params = new URLSearchParams({ today: toDateStr(new Date()) });
      params.set("userId", String(currentUserId));
      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        try {
          const raw = localStorage.getItem(AUTH_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            localStorage.setItem(AUTH_KEY, JSON.stringify({ ...parsed, user: data.user }));
          }
        } catch {}
      }
      if (data.employee) {
        setEmployee(data.employee);
        try {
          const raw = localStorage.getItem(AUTH_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            localStorage.setItem(AUTH_KEY, JSON.stringify({ ...parsed, employee: data.employee }));
          }
        } catch {}
      }
      const readIds = loadReadIds();
      setNotifications(
        (data.notifications || []).map((n: NotificationItem) => ({ ...n, isRead: readIds.includes(n.id) ? 1 : n.isRead }))
      );
      setStreakCount(data.streak ?? 0);
    } catch (err) {
      console.error("Failed to load data", err);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
  }, [refreshData, dataVersion, currentUser?.id]);

  // Login handler
  const login = useCallback(
    async ({ email, password, role }: { email: string; password?: string; role?: string }) => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: password || "password123", role }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          return { success: false, error: data.error || "Authentication failed." };
        }

        setCurrentUser(data.user);
        setEmployee(data.employee);

        try {
          localStorage.setItem(
            AUTH_KEY,
            JSON.stringify({
              user: data.user,
              employee: data.employee,
              token: data.token,
            })
          );
        } catch {}

        toast({
          title: `Welcome back, ${data.user.name.split(" ")[0]}!`,
          description: data.user.role === "admin" ? "Admin Command Sector active." : "Employee Workspace ready.",
          variant: "success",
        });

        if (data.user.role === "admin" && role === "admin") {
          setActiveTab("admin-hub");
        } else {
          setActiveTab("dashboard");
        }

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || "Network error during login." };
      }
    },
    [toast]
  );

  // Logout handler
  const logout = useCallback(() => {
    setCurrentUser(null);
    setEmployee(null);
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {}
    toast({
      title: "Signed out",
      description: "You have securely signed out of your session.",
      variant: "default",
    });
  }, [toast]);

  // Switch User Impersonation / Multi-user switch
  const switchUser = useCallback(
    async (userId: number) => {
      const match = availableAccounts.find((a) => a.user.id === userId);
      if (match) {
        setCurrentUser(match.user);
        setEmployee(match.employee);
        try {
          localStorage.setItem(
            AUTH_KEY,
            JSON.stringify({
              user: match.user,
              employee: match.employee,
              token: `switch_${match.user.id}`,
            })
          );
        } catch {}
        toast({
          title: `Switched view to ${match.user.name}`,
          description: `Department: ${match.user.department}`,
          variant: "default",
        });
      }
    },
    [availableAccounts, toast]
  );

  const persistRead = (ids: number[]) => {
    try {
      localStorage.setItem(READ_KEY, JSON.stringify(ids));
    } catch {}
  };

  const markNotificationAsRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: 1 } : n)));
    persistRead(Array.from(new Set([...loadReadIds(), id])));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
    persistRead(Array.from(new Set([...loadReadIds(), ...notifications.map((n) => n.id)])));
  };

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setConfirmState({
          options,
          resolve: (v: boolean) => {
            setConfirmState(null);
            resolve(v);
          },
        });
      }),
    []
  );

  const unreadCount = notifications.filter((n) => n.isRead === 0).length;
  const isAuthenticated = !!currentUser;
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "manager";

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        employee,
        setEmployee,
        isAuthenticated,
        isAdmin,
        authLoading,
        login,
        logout,
        switchUser,
        availableAccounts,
        notifications,
        unreadCount,
        markNotificationAsRead,
        markAllRead,
        theme,
        setTheme,
        toggleTheme,
        streakCount,
        activeTab,
        setActiveTab,
        searchQuery,
        setSearchQuery,
        refreshData,
        dataVersion,
        notifyDataChanged: () => setDataVersion((v) => v + 1),
        toasts,
        toast,
        dismissToast,
        confirm,
        confirmState,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
}
