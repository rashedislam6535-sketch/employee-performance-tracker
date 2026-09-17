"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { downloadFile, num, toCsv } from "@/lib/utils";
import { Sun, Moon, Download } from "lucide-react";

const muted = "text-zinc-500 dark:text-zinc-400";
const card = "rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";
const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[13px] outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-500";
const btn =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800";

export function SettingsView() {
  const { currentUser, setCurrentUser, theme, setTheme, notifyDataChanged, toast, confirm, setActiveTab, employee } = useApp();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setName(currentUser?.name ?? "");
    setDepartment(currentUser?.department ?? "");
  }, [currentUser?.id, currentUser?.name, currentUser?.department]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, name, department }),
      });
      const json = await res.json();
      if (res.ok && json.user) {
        setCurrentUser(json.user);
        notifyDataChanged();
        toast({ title: "Profile saved", variant: "success" });
      } else {
        toast({ title: json.error || "Could not save", variant: "error" });
      }
    } finally {
      setSaving(false);
    }
  };

  const exportAll = async () => {
    if (!currentUser) return;
    const res = await fetch(`/api/entries?userId=${currentUser.id}`);
    if (!res.ok) return;
    const data = await res.json();
    const rows = (data.entries || []).map((u: any) => ({ ...u, taskType: u.label, trainingHours: num(u.trainingHours), details: [u.country, u.accountId && `MT ${u.accountId}`, u.ticketCategory, u.priority, u.status].filter(Boolean).join(" · ") }));
    downloadFile(
      "work-log-all.csv",
      toCsv(rows, [
        { key: "date", label: "Date" },
        { key: "taskType", label: "Activity" },
        { key: "description", label: "Description" },
        { key: "details", label: "Details" },
        { key: "tickets", label: "Tickets" },
        { key: "chats", label: "Chats" },
        { key: "kyc", label: "KYC" },
        { key: "calls", label: "Calls" },
        { key: "emails", label: "Emails" },
        { key: "trainingHours", label: "Training hours" },
      ]),
      "text/csv;charset=utf-8"
    );
  };

  const clearDraft = () => {
    localStorage.removeItem("workpulse_update_draft");
    toast({ title: "Draft cleared" });
  };

  const deleteAll = async () => {
    if (!currentUser) return;
    const ok = await confirm({
      title: "Delete all entries?",
      description: "Every activity, daily summary, attendance record and report will be removed. Your profile is kept. This cannot be undone.",
      confirmText: "Delete everything",
      destructive: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      if (res.ok) {
        notifyDataChanged();
        toast({ title: "All entries deleted", variant: "success" });
      } else {
        toast({ title: "Could not delete entries", variant: "error" });
      }
    } finally {
      setDeleting(false);
    }
  };

  const segment = (active: boolean) =>
    `inline-flex h-8 items-center gap-1.5 px-3 text-[13px] ${
      active ? "bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
    }`;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <form onSubmit={saveProfile} className={card}>
        <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <h3 className="text-[13px] font-medium">Profile</h3>
          <p className={`text-xs ${muted}`}>
            Quick edit. Photo, personal details and availability are on the{" "}
            <button type="button" onClick={() => setActiveTab("profile")} className="text-indigo-600 hover:underline dark:text-indigo-400">
              Profile page
            </button>
            .
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Department / role</label>
            <input value={department} onChange={(e) => setDepartment(e.target.value)} className={inputCls} placeholder="Customer Support" />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <span className={`text-xs ${muted}`}>{employee?.employeeCode ? `Employee ID ${employee.employeeCode}` : ""}</span>
          <button type="submit" disabled={saving} className="inline-flex h-8 items-center rounded-md bg-indigo-600 px-3 text-[13px] font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>

      <div className={card}>
        <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <h3 className="text-[13px] font-medium">Appearance</h3>
        </div>
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="text-[13px]">Theme</p>
            <p className={`text-xs ${muted}`}>Saved on this device.</p>
          </div>
          <div className="inline-flex overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-700">
            <button type="button" onClick={() => setTheme("light")} className={segment(theme === "light")}>
              <Sun className="h-3.5 w-3.5" /> Light
            </button>
            <button type="button" onClick={() => setTheme("dark")} className={segment(theme === "dark")}>
              <Moon className="h-3.5 w-3.5" /> Dark
            </button>
          </div>
        </div>
      </div>

      <div className={card}>
        <div className="border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <h3 className="text-[13px] font-medium">Data</h3>
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-[13px]">Export all entries</p>
              <p className={`text-xs ${muted}`}>Every logged update as a CSV file (opens in Excel).</p>
            </div>
            <button onClick={exportAll} className={btn}>
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-[13px]">Unsaved draft</p>
              <p className={`text-xs ${muted}`}>The update form keeps a local draft while you type.</p>
            </div>
            <button onClick={clearDraft} className={btn}>
              Clear draft
            </button>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-[13px]">Delete all entries</p>
              <p className={`text-xs ${muted}`}>Removes every activity, daily summary, attendance record and report. Your profile is kept. Cannot be undone.</p>
            </div>
            <button
              onClick={deleteAll}
              disabled={deleting}
              className="inline-flex h-8 items-center rounded-md border border-rose-200 px-3 text-[13px] font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40"
            >
              {deleting ? "Deleting…" : "Delete all"}
            </button>
          </div>
        </div>
      </div>

      <p className={`text-xs ${muted}`}>WorkPulse · Next.js, PostgreSQL (Supabase-compatible), Drizzle ORM. Set DATABASE_URL to deploy.</p>
    </div>
  );
}
