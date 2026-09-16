"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { User, NotificationItem } from "@/types";
import { toDateStr } from "@/lib/utils";

type Theme = "light" | "dark";

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User) => void;
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const READ_KEY = "workpulse_read_notifications";

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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [theme, setThemeState] = useState<Theme>("light");
  const [streakCount, setStreakCount] = useState(0);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [dataVersion, setDataVersion] = useState(0);

  // Pick up whatever the pre-hydration script decided.
  useEffect(() => {
    setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyThemeClass(t);
    try {
      localStorage.setItem("workpulse_theme", t);
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const currentUserId = currentUser?.id;

  const refreshData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ today: toDateStr(new Date()) });
      if (currentUserId) params.set("userId", String(currentUserId));
      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.user) setCurrentUser(data.user);
      const readIds = loadReadIds();
      setNotifications(
        (data.notifications || []).map((n: NotificationItem) => ({
          ...n,
          isRead: readIds.includes(n.id) ? 1 : n.isRead,
        }))
      );
      setStreakCount(data.streak ?? 0);
    } catch (err) {
      console.error("Failed to load data", err);
    }
  }, [currentUserId]);

  useEffect(() => {
    refreshData();
  }, [refreshData, dataVersion]);

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

  const unreadCount = notifications.filter((n) => n.isRead === 0).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
