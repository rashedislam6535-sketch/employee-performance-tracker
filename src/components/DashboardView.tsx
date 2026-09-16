"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { LineChart, BarChart, DonutChart } from "@/components/charts";
import {
  calculateProductivityScore,
  DAILY_TARGETS,
  formatLongDate,
  formatShortDate,
  formatDate,
  summarizeMetrics,
  taskColor,
  toDateStr,
  weekdayShort,
  num,
} from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Check, ChevronRight } from "lucide-react";

interface DayPoint {
  date: string;
  tickets: number;
  chats: number;
  kyc: number;
  calls: number;
  emails: number;
  trainingHours: number;
  count: number;
  total: number;
  score: number;
  hasData: boolean;
}

interface DashboardData {
  todayDate: string;
  today: Omit<DayPoint, "date" | "total" | "score">;
  yesterday: Omit<DayPoint, "date" | "total" | "score">;
  series: DayPoint[];
  weekTotals: { thisWeek: number; lastWeek: number };
  monthTotals: {
    tickets: number;
    chats: number;
    kyc: number;
    calls: number;
    emails: number;
    trainingHours: number;
    count: number;
    daysLogged: number;
  };
  taskDistribution: { taskType: string; count: number }[];
  streak: number;
  recentUpdates: any[];
  attendance: { checkInTime: string; status: string } | null;
}

const card = "rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";
const muted = "text-zinc-500 dark:text-zinc-400";

type MetricKey = "tickets" | "chats" | "kyc" | "calls" | "emails" | "trainingHours";
const METRICS: { key: MetricKey; label: string; suffix?: string }[] = [
  { key: "tickets", label: "Tickets" },
  { key: "chats", label: "Chats" },
  { key: "kyc", label: "KYC completed" },
  { key: "calls", label: "Calls" },
  { key: "emails", label: "Emails" },
  { key: "trainingHours", label: "Training", suffix: "h" },
];

function Delta({ today, yesterday, hadYesterday }: { today: number; yesterday: number; hadYesterday: boolean }) {
  if (!hadYesterday) return <p className={`mt-1 text-[11px] ${muted}`}>No entry yesterday</p>;
  const d = Number((today - yesterday).toFixed(1));
  if (d === 0) return <p className={`mt-1 text-[11px] ${muted}`}>Same as yesterday</p>;
  const up = d > 0;
  return (
    <p className={`mt-1 flex items-center gap-0.5 text-[11px] ${up ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500"}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {up ? "+" : ""}
      {d} vs yesterday
    </p>
  );
}

export function DashboardView() {
  const { currentUser, setActiveTab, dataVersion } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const userId = currentUser?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    const params = new URLSearchParams({ userId: String(userId), today: toDateStr(new Date()) });
    const res = await fetch(`/api/dashboard?${params.toString()}`);
    if (res.ok) setData(await res.json());
  }, [userId]);

  useEffect(() => {
    load();
  }, [load, dataVersion]);

  const checkIn = async () => {
    if (!userId) return;
    setCheckingIn(true);
    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          status: "present",
          date: toDateStr(new Date()),
          checkInTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        }),
      });
      await load();
    } finally {
      setCheckingIn(false);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = currentUser?.name?.split(" ")[0] ?? "";

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-56 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {METRICS.map((m) => (
            <div key={m.key} className="h-24 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  const today = data.today;
  const score = calculateProductivityScore(today);
  const { thisWeek, lastWeek } = data.weekTotals;
  const weekPct = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;
  const last7 = data.series.slice(7);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h2>
          <p className={`mt-0.5 text-[13px] ${muted}`}>
            {formatLongDate(data.todayDate)} · {today.count} {today.count === 1 ? "update" : "updates"} logged today
            {data.streak > 0 && <> · {data.streak}-day streak</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data.attendance ? (
            <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-[13px] dark:border-zinc-800 dark:bg-zinc-900">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              Checked in {data.attendance.checkInTime}
            </span>
          ) : (
            <button
              onClick={checkIn}
              disabled={checkingIn}
              className="inline-flex h-8 items-center rounded-md border border-zinc-200 bg-white px-3 text-[13px] font-medium hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              {checkingIn ? "Checking in…" : "Check in"}
            </button>
          )}
          <button
            onClick={() => setActiveTab("daily-update")}
            className="inline-flex h-8 items-center rounded-md bg-indigo-600 px-3 text-[13px] font-medium text-white hover:bg-indigo-700"
          >
            Log work
          </button>
        </div>
      </div>

      {/* Today's numbers */}
      <section>
        <h3 className={`mb-2 text-xs font-medium uppercase tracking-wide ${muted}`}>Today</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {METRICS.map((m) => {
            const v = num(today[m.key]);
            const y = num(data.yesterday[m.key]);
            return (
              <div key={m.key} className={`${card} p-4`}>
                <p className={`text-xs ${muted}`}>{m.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                  {v}
                  {m.suffix && <span className="ml-0.5 text-sm font-normal text-zinc-400">{m.suffix}</span>}
                </p>
                <Delta today={v} yesterday={y} hadYesterday={data.yesterday.hasData} />
              </div>
            );
          })}
        </div>
      </section>

      {/* Activity + score */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`${card} p-5 lg:col-span-2`}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium">Daily activity</h3>
              <p className={`text-xs ${muted}`}>Items handled per day, last 14 days</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium tabular-nums">
                {thisWeek} <span className={`font-normal ${muted}`}>this week</span>
              </p>
              <p className={`text-xs tabular-nums ${muted}`}>
                {lastWeek} last week
                {weekPct !== null && (
                  <span className={weekPct >= 0 ? "ml-1.5 text-emerald-600 dark:text-emerald-400" : "ml-1.5 text-rose-600 dark:text-rose-400"}>
                    {weekPct >= 0 ? "+" : ""}
                    {weekPct}%
                  </span>
                )}
              </p>
            </div>
          </div>
          <LineChart points={data.series.map((p) => p.total)} labels={data.series.map((p) => formatShortDate(p.date))} />
        </div>

        <div className={`${card} p-5`}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium">Productivity score</h3>
              <p className={`text-xs ${muted}`}>Against daily targets</p>
            </div>
            <span className="text-2xl font-semibold tabular-nums tracking-tight">{score}%</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${score}%` }} />
          </div>
          <ul className="mt-4 space-y-2.5">
            {METRICS.map((m) => {
              const v = num(today[m.key]);
              const target = DAILY_TARGETS[m.key];
              const pct = Math.min(100, Math.round((v / target) * 100));
              return (
                <li key={m.key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-700 dark:text-zinc-300">{m.label}</span>
                    <span className={`tabular-nums ${muted}`}>
                      {v}
                      {m.suffix ?? ""} / {target}
                      {m.suffix ?? ""}
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Week bars + distribution + month */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`${card} p-5`}>
          <h3 className="text-sm font-medium">This week</h3>
          <p className={`mb-3 text-xs ${muted}`}>Last 7 days by category</p>
          <BarChart
            data={last7.map((p) => ({ label: weekdayShort(p.date), values: [p.tickets, p.chats, p.kyc, p.calls] }))}
            series={["Tickets", "Chats", "KYC", "Calls"]}
            colors={["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b"]}
            height={170}
          />
        </div>

        <div className={`${card} p-5`}>
          <h3 className="text-sm font-medium">Task distribution</h3>
          <p className={`mb-4 text-xs ${muted}`}>Entries by task type, last 30 days</p>
          <DonutChart
            data={data.taskDistribution.map((t) => ({ label: t.taskType, value: t.count, color: taskColor(t.taskType) }))}
          />
        </div>

        <div className={`${card} p-5`}>
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium">Month to date</h3>
              <p className={`text-xs ${muted}`}>
                {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} · {data.monthTotals.daysLogged} days logged
              </p>
            </div>
            <button onClick={() => setActiveTab("performance")} className={`inline-flex items-center gap-0.5 text-xs ${muted} hover:text-zinc-900 dark:hover:text-zinc-100`}>
              Details <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <dl className="mt-3 divide-y divide-zinc-100 text-[13px] dark:divide-zinc-800">
            {METRICS.map((m) => (
              <div key={m.key} className="flex items-center justify-between py-1.5">
                <dt className="text-zinc-600 dark:text-zinc-400">{m.label}</dt>
                <dd className="font-medium tabular-nums">
                  {num(data.monthTotals[m.key])}
                  {m.suffix ?? ""}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Recent entries */}
      <div className={card}>
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <h3 className="text-sm font-medium">Recent entries</h3>
          <button onClick={() => setActiveTab("timeline")} className={`inline-flex items-center gap-0.5 text-xs ${muted} hover:text-zinc-900 dark:hover:text-zinc-100`}>
            View timeline <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {data.recentUpdates.length === 0 ? (
          <p className={`px-5 py-8 text-center text-[13px] ${muted}`}>No entries yet. Log your first work update.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.recentUpdates.slice(0, 6).map((u) => (
              <li key={u.id} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: taskColor(u.taskType) }} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-[13px] font-medium">{u.taskType}</span>
                    <span className={`text-xs ${muted}`}>{formatDate(u.date)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[13px] text-zinc-600 dark:text-zinc-400">{u.description}</p>
                </div>
                <span className={`hidden shrink-0 text-xs tabular-nums sm:block ${muted}`}>{summarizeMetrics(u)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
