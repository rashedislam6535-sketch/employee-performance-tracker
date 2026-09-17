"use client";

import React, { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  LayoutDashboard,
  PlusCircle,
  Clock,
  CalendarDays,
  BarChart3,
  FileText,
  Settings,
  Moon,
  Sun,
  Bell,
  Search,
  Menu,
  X,
  Plus,
  UserCircle,
} from "lucide-react";
import { availabilityMeta } from "@/lib/utils";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "daily-update", label: "New update", icon: PlusCircle },
  { id: "timeline", label: "Timeline", icon: Clock },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "reports", label: "Reports", icon: FileText },
];

export const PAGE_TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  "daily-update": "New work update",
  timeline: "Timeline",
  calendar: "Calendar",
  performance: "Monthly performance",
  reports: "Weekly reports",
  profile: "Employee profile",
  settings: "Settings",
};

export function Avatar({ name, photo, className = "h-8 w-8 text-xs" }: { name?: string | null; photo?: string | null; className?: string }) {
  if (photo) {
    return <img src={photo} alt={name || "Profile photo"} className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  const initials = (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-zinc-200 font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 ${className}`}
    >
      {initials}
    </div>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { currentUser, employee, activeTab, setActiveTab, theme, toggleTheme } = useApp();
  const avail = availabilityMeta(employee?.availability);

  const go = (id: string) => {
    setActiveTab(id);
    onClose();
  };

  const itemCls = (active: boolean) =>
    `flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
      active
        ? "bg-zinc-200/70 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
        : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100"
    }`;

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-zinc-200 bg-zinc-100 transition-transform dark:border-zinc-800 dark:bg-zinc-950 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-900 text-[11px] font-bold text-white dark:bg-white dark:text-zinc-900">
              W
            </div>
            <span className="text-sm font-semibold tracking-tight">WorkPulse</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-200 lg:hidden dark:hover:bg-zinc-800"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-1">
          <div>
            <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Workspace
            </p>
            <div className="space-y-0.5">
              {NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <button key={item.id} onClick={() => go(item.id)} className={itemCls(activeTab === item.id)}>
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Account
            </p>
            <div className="space-y-0.5">
              <button onClick={() => go("profile")} className={itemCls(activeTab === "profile")}>
                <UserCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>Profile</span>
              </button>
              <button onClick={() => go("settings")} className={itemCls(activeTab === "settings")}>
                <Settings className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </nav>

        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <button onClick={() => go("profile")} className="relative shrink-0 rounded-full" title="Open profile">
              <Avatar name={employee?.name ?? currentUser?.name} photo={employee?.photo} />
              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-zinc-100 dark:ring-zinc-950 ${avail.dot}`} title={avail.label} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{employee?.name ?? currentUser?.name ?? "—"}</p>
              <p className="truncate text-[11px] text-zinc-500">{employee?.designation || employee?.department || currentUser?.department || avail.label}</p>
            </div>
            <button
              onClick={toggleTheme}
              className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const {
    activeTab,
    setActiveTab,
    notifications,
    unreadCount,
    markNotificationAsRead,
    markAllRead,
    searchQuery,
    setSearchQuery,
  } = useApp();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(searchQuery);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    setQ(searchQuery);
  }, [searchQuery]);

  return (
    <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-zinc-200 bg-zinc-50/90 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90 sm:px-6">
      <button
        onClick={onMenu}
        className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-200/60 lg:hidden dark:text-zinc-300 dark:hover:bg-zinc-800"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>
      <h1 className="text-sm font-semibold">{PAGE_TITLES[activeTab] ?? "WorkPulse"}</h1>

      <div className="ml-auto flex items-center gap-1.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearchQuery(q.trim());
            setActiveTab("timeline");
          }}
          className="relative hidden sm:block"
        >
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search updates"
            className="h-8 w-56 rounded-md border border-zinc-200 bg-white pl-8 pr-3 text-[13px] outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-zinc-600"
          />
        </form>

        <div className="relative" ref={popRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="relative rounded-md p-2 text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />}
          </button>

          {open && (
            <div className="absolute right-0 mt-1 w-80 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                <span className="text-xs font-medium">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-zinc-500">You&apos;re all caught up.</p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markNotificationAsRead(n.id)}
                      className="flex w-full items-start gap-2.5 border-b border-zinc-100 px-3 py-2.5 text-left last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/50"
                    >
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.isRead ? "bg-transparent" : "bg-indigo-500"}`} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium">{n.title}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{n.message}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setActiveTab("daily-update")}
          className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-md bg-indigo-600 px-3 text-[13px] font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New update</span>
        </button>
      </div>
    </header>
  );
}
