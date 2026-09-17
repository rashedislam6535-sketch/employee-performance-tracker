"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { LineChart, BarChart, DonutChart } from "@/components/charts";
import { AttendanceCard, attendanceSummary } from "@/components/AttendanceCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton, StatSkeleton, EmptyState } from "@/components/ui/skeleton";
import { categoryScores, formatLongDate, formatShortDate, formatDate, summarizeMetrics, taskColor, toDateStr, num, METRIC_KEYS, METRIC_LABELS, availabilityMeta, formatDuration, cn } from "@/lib/utils";
import type { DashboardData, AttendanceRecord } from "@/types";
import { ArrowUpRight, ArrowDownRight, ChevronRight, ClipboardList, Clock, Coffee, CheckSquare, Gauge, BarChart3, PieChart } from "lucide-react";

const muted = "text-zinc-500 dark:text-zinc-400";

function Delta({ today, prev, hadPrev, label, suffix = "" }: { today: number; prev: number; hadPrev: boolean; label: string; suffix?: string }) {
  if (!hadPrev) return <p className={`mt-1 text-[11px] ${muted}`}>No activity recorded {label.toLowerCase()}</p>;
  const d = Number((today - prev).toFixed(1));
  return (
    <p className={`mt-1 flex items-center gap-1 text-[11px] ${muted}`}>
      <span>
        {label}: <span className="font-medium text-zinc-700 dark:text-zinc-300">{prev}{suffix}</span>
      </span>
      {d !== 0 && (
        <span className={cn("inline-flex items-center", d > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
          {d > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {d > 0 ? "+" : ""}
          {d}
        </span>
      )}
    </p>
  );
}

export function DashboardView() {
  const { currentUser, employee, setActiveTab, dataVersion, notifyDataChanged } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  const userId = currentUser?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const params = new URLSearchParams({ userId: String(userId), today: toDateStr(new Date()) });
      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (!res.ok) throw new Error((await res.json()).error || "Failed to load");
      setData(await res.json());
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load, dataVersion]);

  const onAttendanceChanged = (rec: AttendanceRecord | null) => {
    setData((d) => (d ? { ...d, attendance: rec } : d));
    notifyDataChanged();
  };

  if (error) {
    return <EmptyState title="Couldn't load the dashboard" description={error} actionLabel="Retry" onAction={load} />;
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3 w-80" />
        </div>
        <StatSkeleton count={4} />
        <StatSkeleton count={6} />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = (employee?.nickname || employee?.name || currentUser?.name || "").split(" ")[0];
  const avail = availabilityMeta(employee?.availability);
  const today = data.today;
  const prev = data.previous;
  const scores = categoryScores(today);
  const att = attendanceSummary(data.attendance);
  const { thisWeek, lastWeek } = data.weekTotals;
  const weekPct = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;
  const weekHasData = data.week.some((d) => d.tickets + d.chats + d.kyc + d.calls > 0);

  const summaryCards = [
    { icon: Clock, label: "Attendance", value: data.isWeekend && !data.attendance?.checkIn ? "Weekend" : att.working, sub: data.isWeekend && !data.attendance?.checkIn ? "No attendance required" : att.sub },
    { icon: Coffee, label: "Break", value: data.attendance?.checkIn ? att.breakTotal : "—", sub: data.attendance ? `${data.attendance.breaks.length} break${data.attendance.breaks.length === 1 ? "" : "s"}` : "No breaks yet" },
    { icon: CheckSquare, label: "Tasks completed", value: String(today.tasksCompleted), sub: `${today.count} ${today.count === 1 ? "entry" : "entries"} logged today` },
    { icon: Gauge, label: "Productivity", value: `${today.score}%`, sub: "Average of all categories", bar: today.score },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">
              {greeting}
              {firstName ? `, ${firstName}` : ""}
            </h2>
            <Badge className={avail.badge} variant="outline">
              <span className={`h-1.5 w-1.5 rounded-full ${avail.dot}`} /> {avail.label}
            </Badge>
          </div>
          <p className={`mt-0.5 text-[13px] ${muted}`}>
            {formatLongDate(data.todayDate)}
            {data.isWeekend && " · Weekend"}
            {data.streak > 0 && <> · {data.streak}-day streak</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setActiveTab("performance")}>
            Monthly report
          </Button>
          <Button onClick={() => setActiveTab("daily-update")}>Log activity</Button>
        </div>
      </div>

      {/* Today's summary */}
      <section>
        <h3 className={`mb-2 text-xs font-medium uppercase tracking-wide ${muted}`}>Today&apos;s summary</h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summaryCards.map((c) => (
            <Card key={c.label} className="p-4">
              <div className="flex items-center justify-between">
                <p className={`text-xs ${muted}`}>{c.label}</p>
                <c.icon className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.75} />
              </div>
              <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{c.value}</p>
              {"bar" in c && typeof c.bar === "number" ? (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${c.bar}%` }} />
                </div>
              ) : null}
              <p className={`mt-1 truncate text-[11px] ${muted}`}>{c.sub}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Metric cards */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className={`text-xs font-medium uppercase tracking-wide ${muted}`}>Today&apos;s activity</h3>
          <span className={`text-[11px] ${muted}`}>vs. {prev.label.toLowerCase()} ({formatShortDate(prev.date)})</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {METRIC_KEYS.map((key) => {
            const v = num(today[key]);
            const p = num(prev[key]);
            const suffix = key === "trainingHours" ? "h" : "";
            const s = scores.find((x) => x.key === key)!;
            return (
              <Card key={key} className="p-4">
                <div className="flex items-center justify-between">
                  <p className={`text-xs ${muted}`}>{key === "kyc" ? "KYC completed" : METRIC_LABELS[key]}</p>
                  <span className={cn("text-[11px] tabular-nums", s.pct >= 100 ? "text-emerald-600 dark:text-emerald-400" : muted)}>{s.rawPct}%</span>
                </div>
                <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                  {v}
                  {suffix && <span className="ml-0.5 text-sm font-normal text-zinc-400">h</span>}
                </p>
                <p className={`text-[11px] ${muted}`}>Today · target {s.target}{suffix}</p>
                <Delta today={v} prev={p} hadPrev={prev.hasData} label={prev.label} suffix={suffix} />
              </Card>
            );
          })}
        </div>
      </section>

      {/* Attendance + productivity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AttendanceCard record={data.attendance} isWeekend={data.isWeekend} onChanged={onAttendanceChanged} />

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Productivity score</CardTitle>
              <CardDescription>Completed ÷ daily target × 100, averaged across categories</CardDescription>
            </div>
            <span className="text-2xl font-semibold tabular-nums tracking-tight">{today.score}%</span>
          </CardHeader>
          <CardContent>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${today.score}%` }} />
            </div>
            <ul className="mt-4 space-y-3">
              {scores.map((s) => {
                const suffix = s.key === "trainingHours" ? "h" : "";
                return (
                  <li key={s.key}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-700 dark:text-zinc-300">{s.label}</span>
                      <span className={`tabular-nums ${muted}`}>
                        {s.completed}{suffix} / {s.target}{suffix}
                        <span className={cn("ml-2 inline-block w-9 text-right font-medium", s.pct >= 100 ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-700 dark:text-zinc-300")}>{s.pct}%</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div className={cn("h-full rounded-full transition-all", s.pct >= 100 ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-500")} style={{ width: `${s.pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Weekly chart + distribution + month */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Weekly activity</CardTitle>
            <CardDescription>Monday – Friday, this week</CardDescription>
          </CardHeader>
          <CardContent>
            {weekHasData ? (
              <BarChart
                data={data.week.map((d) => ({ label: d.label, values: [d.tickets, d.chats, d.kyc, d.calls] }))}
                series={["Tickets", "Chats", "KYC", "Calls"]}
                colors={["#6366f1", "#14b8a6", "#10b981", "#8b5cf6"]}
                height={170}
              />
            ) : (
              <EmptyState compact icon={BarChart3} title="Nothing logged this week yet" description="Your Monday–Friday activity will appear here." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task distribution</CardTitle>
            <CardDescription>Entries by type, last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {data.taskDistribution.length ? (
              <DonutChart data={data.taskDistribution.map((t) => ({ label: t.label, value: t.count, color: taskColor(t.label) }))} />
            ) : (
              <EmptyState compact icon={PieChart} title="No entries in the last 30 days" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Month to date</CardTitle>
              <CardDescription>{data.month.label}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab("performance")}>
              Details <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            <dl className="divide-y divide-zinc-100 text-[13px] dark:divide-zinc-800">
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-zinc-600 dark:text-zinc-400">Working days</dt>
                <dd className="font-medium tabular-nums">
                  {data.month.workingDaysElapsed} <span className={`font-normal ${muted}`}>of {data.month.workingDaysTotal}</span>
                </dd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-zinc-600 dark:text-zinc-400">Attendance</dt>
                <dd className="font-medium tabular-nums">
                  {data.month.attendanceDays} days <span className={`font-normal ${muted}`}>· {data.month.attendancePct}%</span>
                </dd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <dt className="text-zinc-600 dark:text-zinc-400">Hours worked</dt>
                <dd className="font-medium tabular-nums">{formatDuration(data.month.workingMinutes)}</dd>
              </div>
              {METRIC_KEYS.map((k) => (
                <div key={k} className="flex items-center justify-between py-1.5">
                  <dt className="text-zinc-600 dark:text-zinc-400">{METRIC_LABELS[k]}</dt>
                  <dd className="font-medium tabular-nums">
                    {num(data.month[k])}
                    {k === "trainingHours" ? "h" : ""}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* 14-day trend */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle>Daily activity</CardTitle>
            <CardDescription>Tasks completed per day, last 14 days</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium tabular-nums">
              {thisWeek} <span className={`font-normal ${muted}`}>last 7 days</span>
            </p>
            <p className={`text-xs tabular-nums ${muted}`}>
              {lastWeek} previous 7 days
              {weekPct !== null && (
                <span className={weekPct >= 0 ? "ml-1.5 text-emerald-600 dark:text-emerald-400" : "ml-1.5 text-rose-600 dark:text-rose-400"}>
                  {weekPct >= 0 ? "+" : ""}
                  {weekPct}%
                </span>
              )}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <LineChart points={data.series.map((p) => p.total)} labels={data.series.map((p) => formatShortDate(p.date))} />
        </CardContent>
      </Card>

      {/* Recent entries */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent entries</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setActiveTab("timeline")}>
            View timeline <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-0 pt-2">
          {data.recentEntries.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState compact icon={ClipboardList} title="No entries yet" description="Log your first activity to see it here." actionLabel="Log activity" onAction={() => setActiveTab("daily-update")} />
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.recentEntries.slice(0, 6).map((e) => (
                <li key={e.id} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: taskColor(e.label) }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[13px] font-medium">{e.label}</span>
                      <span className={`text-xs ${muted}`}>{formatDate(e.date)}</span>
                      {e.country && <Badge variant="outline">{e.country}</Badge>}
                      {e.accountId && <Badge variant="outline">MT {e.accountId}</Badge>}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[13px] text-zinc-600 dark:text-zinc-400">{e.description || e.ticketCategory || summarizeMetrics(e)}</p>
                  </div>
                  <span className={`hidden shrink-0 text-xs tabular-nums sm:block ${muted}`}>{summarizeMetrics(e)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
