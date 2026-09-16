"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { DailyUpdate } from "@/types";
import { calculateProductivityScore, downloadFile, formatDate, formatMonthYear, num, toCsv, toDateStr } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Download, Printer } from "lucide-react";

const muted = "text-zinc-500 dark:text-zinc-400";
const card = "rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";

function workingDaysSoFar(year: number, month: number): number {
  const today = new Date();
  const last = new Date(year, month + 1, 0);
  const end = today < last ? today : last;
  if (end < new Date(year, month, 1)) return 0;
  let n = 0;
  for (let d = 1; d <= end.getDate(); d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow !== 0 && dow !== 6) n++;
  }
  return n;
}

export function PerformanceTrackerView() {
  const { currentUser, dataVersion } = useApp();
  const [updates, setUpdates] = useState<DailyUpdate[]>([]);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const userId = currentUser?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/updates?userId=${userId}`);
    if (res.ok) {
      const data = await res.json();
      setUpdates(data.updates || []);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load, dataVersion]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  const monthUpdates = useMemo(() => updates.filter((u) => u.date.startsWith(prefix)), [updates, prefix]);

  const totals = useMemo(() => {
    const t = { tickets: 0, chats: 0, kyc: 0, calls: 0, emails: 0, trainingHours: 0 };
    for (const u of monthUpdates) {
      t.tickets += u.tickets;
      t.chats += u.chats;
      t.kyc += u.kyc;
      t.calls += u.calls;
      t.emails += u.emails;
      t.trainingHours += num(u.trainingHours);
    }
    return t;
  }, [monthUpdates]);

  const daysLogged = new Set(monthUpdates.map((u) => u.date)).size;
  const workingDays = workingDaysSoFar(year, month);

  const avgScore = useMemo(() => {
    const byDate: Record<string, DailyUpdate[]> = {};
    for (const u of monthUpdates) (byDate[u.date] ||= []).push(u);
    const scores = Object.values(byDate).map((list) =>
      calculateProductivityScore({
        tickets: list.reduce((a, b) => a + b.tickets, 0),
        chats: list.reduce((a, b) => a + b.chats, 0),
        kyc: list.reduce((a, b) => a + b.kyc, 0),
        calls: list.reduce((a, b) => a + b.calls, 0),
        emails: list.reduce((a, b) => a + b.emails, 0),
        trainingHours: list.reduce((a, b) => a + num(b.trainingHours), 0),
      })
    );
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }, [monthUpdates]);

  const exportCsv = () => {
    const csv = toCsv(
      monthUpdates.map((u) => ({ ...u, trainingHours: num(u.trainingHours) })),
      [
        { key: "date", label: "Date" },
        { key: "taskType", label: "Task type" },
        { key: "description", label: "Description" },
        { key: "tickets", label: "Tickets" },
        { key: "chats", label: "Chats" },
        { key: "kyc", label: "KYC" },
        { key: "calls", label: "Calls" },
        { key: "emails", label: "Emails" },
        { key: "trainingHours", label: "Training hours" },
      ]
    );
    downloadFile(`work-log-${prefix}.csv`, csv, "text/csv;charset=utf-8");
  };

  const STATS = [
    { label: "Total tickets", value: totals.tickets },
    { label: "Total chats", value: totals.chats },
    { label: "Total KYC", value: totals.kyc },
    { label: "Total calls", value: totals.calls },
    { label: "Total emails", value: totals.emails },
    { label: "Training hours", value: Number(totals.trainingHours.toFixed(1)) },
  ];

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="rounded-md border border-zinc-200 p-1.5 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[150px] text-center text-[13px] font-medium">{formatMonthYear(cursor)}</span>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="rounded-md border border-zinc-200 p-1.5 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={monthUpdates.length === 0}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <Download className="h-3.5 w-3.5" />
            Export Excel (CSV)
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <Printer className="h-3.5 w-3.5" />
            Export PDF
          </button>
        </div>
      </div>

      <div className={`${card} px-5 py-4`}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-4">
          <div>
            <dt className={`text-xs ${muted}`}>Employee</dt>
            <dd className="font-medium">{currentUser?.name}</dd>
          </div>
          <div>
            <dt className={`text-xs ${muted}`}>Department</dt>
            <dd className="font-medium">{currentUser?.department}</dd>
          </div>
          <div>
            <dt className={`text-xs ${muted}`}>Month</dt>
            <dd className="font-medium">{formatMonthYear(cursor)}</dd>
          </div>
          <div>
            <dt className={`text-xs ${muted}`}>Coverage</dt>
            <dd className="font-medium tabular-nums">
              {daysLogged} of {workingDays} working days · avg score {avgScore}%
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {STATS.map((s) => (
          <div key={s.label} className={`${card} p-4`}>
            <p className={`text-xs ${muted}`}>{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <h3 className="text-[13px] font-medium">Entries</h3>
          <span className={`text-xs ${muted}`}>{monthUpdates.length} rows</span>
        </div>
        {monthUpdates.length === 0 ? (
          <p className={`px-4 py-10 text-center text-[13px] ${muted}`}>No entries for this month.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className={`border-b border-zinc-100 text-xs dark:border-zinc-800 ${muted}`}>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Task type</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 text-right font-medium">Tickets</th>
                  <th className="px-3 py-2 text-right font-medium">Chats</th>
                  <th className="px-3 py-2 text-right font-medium">KYC</th>
                  <th className="px-3 py-2 text-right font-medium">Calls</th>
                  <th className="px-3 py-2 text-right font-medium">Emails</th>
                  <th className="px-4 py-2 text-right font-medium">Training</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {monthUpdates.map((u) => (
                  <tr key={u.id} className="align-top hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="whitespace-nowrap px-4 py-2 tabular-nums">{formatDate(u.date)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{u.taskType}</td>
                    <td className="max-w-md px-3 py-2 text-zinc-600 dark:text-zinc-400">{u.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{u.tickets || "–"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{u.chats || "–"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{u.kyc || "–"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{u.calls || "–"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{u.emails || "–"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{num(u.trainingHours) ? `${num(u.trainingHours)}h` : "–"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-zinc-200 font-medium dark:border-zinc-700">
                  <td className="px-4 py-2" colSpan={3}>
                    Total
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{totals.tickets}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{totals.chats}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{totals.kyc}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{totals.calls}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{totals.emails}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{Number(totals.trainingHours.toFixed(1))}h</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
