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
import { AdminHubView } from "@/components/AdminHubView";
import { LoginView } from "@/components/auth/LoginView";
import { Toaster, ConfirmDialog } from "@/components/Feedback";

export function MainAppLayout() {
  const { activeTab, currentUser, isAuthenticated, authLoading } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  // Initial Auth Loading Screen
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg animate-pulse">
            W
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <div className="h-3 w-3 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span>Loading WorkPulse Workspace...</span>
          </div>
        </div>
      </div>
    );
  }

  // If user is not authenticated, display the Login Interface ("Login Face")
  if (!isAuthenticated || !currentUser) {
    return (
      <>
        <LoginView />
        <Toaster />
      </>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setMenuOpen(true)} />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div key={activeTab} className="fade-in">
            {activeTab === "admin-hub" && <AdminHubView />}
            {activeTab === "dashboard" && <DashboardView />}
            {activeTab === "daily-update" && <LogActivityPage />}
            {activeTab === "timeline" && <TimelineView />}
            {activeTab === "calendar" && <CalendarView />}
            {activeTab === "performance" && <PerformanceTrackerView />}
            {activeTab === "reports" && <ReportsView />}
            {activeTab === "profile" && <ProfileView />}
            {activeTab === "settings" && <SettingsView />}
          </div>
        </main>
      </div>
      <Toaster />
      <ConfirmDialog />
    </div>
  );
}
