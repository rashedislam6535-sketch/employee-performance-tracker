"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Sidebar, TopBar } from "@/components/Navigation";
import { DashboardView } from "@/components/DashboardView";
import { TimelineView } from "@/components/TimelineView";
import { CalendarView } from "@/components/CalendarView";
import { PerformanceTrackerView } from "@/components/PerformanceTrackerView";
import { ReportsView } from "@/components/ReportsView";
import { SettingsView } from "@/components/SettingsView";
import { ProfileView } from "@/components/ProfileView";
import { LogActivityPage } from "@/components/ActivityLogForm";
import { Toaster, ConfirmDialog } from "@/components/Feedback";

export function MainAppLayout() {
  const { activeTab, currentUser } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setMenuOpen(true)} />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {!currentUser ? (
            <div className="space-y-4">
              <div className="h-6 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-24 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                ))}
              </div>
            </div>
          ) : (
            <div key={activeTab} className="fade-in">
              {activeTab === "dashboard" && <DashboardView />}
              {activeTab === "daily-update" && <LogActivityPage />}
              {activeTab === "timeline" && <TimelineView />}
              {activeTab === "calendar" && <CalendarView />}
              {activeTab === "performance" && <PerformanceTrackerView />}
              {activeTab === "reports" && <ReportsView />}
              {activeTab === "profile" && <ProfileView />}
              {activeTab === "settings" && <SettingsView />}
            </div>
          )}
        </main>
      </div>
      <Toaster />
      <ConfirmDialog />
    </div>
  );
}
