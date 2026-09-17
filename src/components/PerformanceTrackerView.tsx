"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import type { Entry, AttendanceRecord } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, priorityVariant, statusVariant } from "@/components/ui/badge";
import { Skeleton, StatSkeleton, EmptyState } from "@/components/ui/skeleton";
import { exportMonthlyPdf, exportMonthlyXlsx } from "@/lib/export";
import { categoryScores, formatDate, formatDuration, formatMonthYear, formatTime, isWeekend, productivityScore, toDateStr, workingDaysInMonth, num, emptyTotals, cn, tasksCompleted } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Download, FileText, FileSpreadsheet, CalendarX2 } from "lucide-react";

const muted = "text-zinc-500 dark:text-zinc-400";

export function PerformanceTrackerView() {
  const { currentUser, employee, dataVersion, toast, setActiveTab } = useApp();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const userId = currentUser?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/entries?userId=${userId}`);
      if (res.ok) {
        const j = await res.json();
        setEntries(j.entries || []);
        setAttendance(j.attendance || []);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load, dataVersion]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthLabel = formatMonthYear(cursor);

  const monthEntries = useMemo(() => entries.filter((e) => e.date.startsWith(prefix)), [entries, prefix]);
  const monthAttendance = useMemo(() => attendance.filter((a) => a.date.startsWith(prefix) && a.checkIn).sort((a, b) => a.date.localeCompare(b.date)), [attendance, prefix]);

  const totals = useMemo(() => {
    const t = emptyTotals();
    for (const e of monthEntries) {
      t.tickets += e.tickets;
      t.chats += e.chats;
      t.kyc += e.kyc;
      t.calls += e.calls;
      t.emails += e.emails;
      t.trainingHours += e.trainingHours;
    }
    t.trainingHours = Number(t.trainingHours.toFixed(2));
    return t;
  }, [monthEntries]);

  const wd = workingDaysInMonth(year, month, new Date());
  const daysLogged = new Set(monthEntries.filter((e) => !isWeekend(e.date)).map((e) => e.date)).size;
  const attendanceDays = new Set(monthAttendance.filter((a) => !isWeekend(a.date)).map((a) => a.date)).size;
  const attendancePct = wd.elapsed ? Math.min(100, Math.round((attendanceDays / wd.elapsed) * 100)) : 0;
  const workedMinutes = monthAttendance.reduce((a, r) => a + (r.status === "checked_out" ? r.workingMinutes : 0), 0);
  const scores = categoryScores(totals, Math.max(1, wd.elapsed));

  const avgScore = useMemo(() => {
    const byDate: Record<string, Entry[]> = {};
    for (const e of monthEntries) if (!isWeekend(e.date)) (byDate[e.date] ||= []).push(e);
    const s = Object.values(byDate).map((list) => {
      const t = emptyTotals();
      for (const e of list) {
        t.tickets += e.tickets;
        t.chats += e.chats;
        t.kyc += e.kyc;
        t.calls += e.calls;
        t.emails += e.emails;
        t.trainingHours += e.trainingHours;
      }
      return productivityScore(t);
    });
    return s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : 0;
  }, [monthEntries]);

  const doExport = async (kind: "xlsx" | "pdf") => {
    if (!employee) return;
    setExporting(kind);
    try {
      const data = { employee, monthLabel, monthKey: prefix, workingDaysTotal: wd.total, workingDaysElapsed: wd.elapsed, attendanceDays, attendancePct, workedMinutes, avgScore, scores, entries: monthEntries.slice().sort((a, b) => a.date.localeCompare(b.date)), attendance: monthAttendance };
      if (kind === "xlsx") await exportMonthlyXlsx(data);
      else await exportMonthlyPdf(data);
      toast({ title: kind === "xlsx" ? "Excel file downloaded" : "PDF downloaded", description: `${monthLabel} · ${employee.name}`, variant: "success" });
    } catch (e: any) {
      toast({ title: "Export failed", description: e?.message, variant: "error" });
    } finally {
      setExporting(null);
    }
  };

  const isCurrentMonth = prefix === toDateStr(new Date()).slice(0, 7);

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[150px] text-center text-[13px] font-medium">{monthLabel}</span>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentMonth && (
            <Button variant="ghost" size="sm" onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>
              Current month
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => doExport("xlsx")} loading={exporting === "xlsx"} disabled={loading || !employee}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> Export Excel
          </Button>
          <Button variant="outline" onClick={() => doExport("pdf")} loading={exporting === "pdf"} disabled={loading || !employee}>
            <FileText className="h-3.5 w-3.5" /> Export PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <>
          <Skeleton className="h-20" />
          <StatSkeleton />
          <Skeleton className="h-64" />
        </>
      ) : (
        <>
          {/* Employee / month header */}
          <Card className="px-5 py-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-3 lg:grid-cols-6">
              <div>
                <dt className={`text-xs ${muted}`}>Employee</dt>
                <dd className="font-medium">{employee?.name}</dd>
              </div>
              <div>
                <dt className={`text-xs ${muted}`}>Department</dt>
                <dd className="font-medium">{employee?.department || "—"}</dd>
              </div>
              <div>
                <dt className={`text-xs ${muted}`}>Month</dt>
                <dd className="font-medium">{monthLabel}</dd>
              </div>
              <div>
                <dt className={`text-xs ${muted}`}>Working days</dt>
                <dd className="font-medium tabular-nums">
                  {wd.elapsed} <span className={`font-normal ${muted}`}>of {wd.total}</span>
                </dd>
              </div>
              <div>
                <dt className={`text-xs ${muted}`}>Attendance</dt>
                <dd className="font-medium tabular-nums">
                  {attendanceDays} days <span className={`font-normal ${muted}`}>· {attendancePct}% · {formatDuration(workedMinutes)}</span>
                </dd>
              </div>
              <div>
                <dt className={`text-xs ${muted}`}>Productivity</dt>
                <dd className="font-medium tabular-nums">
                  {avgScore}% <span className={`font-normal ${muted}`}>avg · {daysLogged} days logged</span>
                </dd>
              </div>
            </dl>
          </Card>

          {/* Category totals with monthly target */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {scores.map((s) => {
              const suffix = s.key === "trainingHours" ? "h" : "";
              return (
                <Card key={s.key} className="p-4">
                  <p className={`text-xs ${muted}`}>Total {s.label.toLowerCase()}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                    {s.completed}
                    {suffix && <span className="ml-0.5 text-sm font-normal text-zinc-400">h</span>}
                  </p>
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div className={cn("h-full rounded-full", s.pct >= 100 ? "bg-emerald-500" : "bg-indigo-500")} style={{ width: `${s.pct}%` }} />
                  </div>
                  <p className={`mt-1 text-[11px] tabular-nums ${muted}`}>
                    {s.rawPct}% of {s.target}
                    {suffix} target
                  </p>
                </Card>
              );
            })}
          </div>

          {/* Attendance table */}
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle>Attendance</CardTitle>
                <CardDescription>Weekends are not counted as working days</CardDescription>
              </div>
              <span className={`text-xs ${muted}`}>{monthAttendance.length} records</span>
            </CardHeader>
            {monthAttendance.length === 0 ? (
              <CardContent className="pt-0">
                <EmptyState compact icon={CalendarX2} title="No attendance recorded" description="Check in from the dashboard to start tracking working hours." actionLabel={isCurrentMonth ? "Go to dashboard" : undefined} onAction={() => setActiveTab("dashboard")} />
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className={`border-y border-zinc-100 text-xs dark:border-zinc-800 ${muted}`}>
                      <th className="px-5 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Check in</th>
                      <th className="px-3 py-2 font-medium">Check out</th>
                      <th className="px-3 py-2 text-right font-medium">Breaks</th>
                      <th className="px-3 py-2 text-right font-medium">Working time</th>
                      <th className="px-5 py-2 font-medium">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {monthAttendance.map((a) => (
                      <tr key={a.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        <td className="whitespace-nowrap px-5 py-2 tabular-nums">
                          {formatDate(a.date)} {isWeekend(a.date) && <Badge variant="info" className="ml-1">Weekend</Badge>}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{formatTime(a.checkIn)}</td>
                        <td className="px-3 py-2 tabular-nums">{formatTime(a.checkOut)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{a.breakMinutes ? formatDuration(a.breakMinutes) : "–"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{a.status === "checked_out" ? formatDuration(a.workingMinutes) : <Badge variant="success">In progress</Badge>}</td>
                        <td className="px-5 py-2">{a.location || "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-zinc-200 font-medium dark:border-zinc-700">
                      <td className="px-5 py-2" colSpan={3}>
                        {attendanceDays} working days present
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatDuration(monthAttendance.reduce((x, r) => x + r.breakMinutes, 0))}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatDuration(workedMinutes)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>

          {/* Entries table */}
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle>Activity log</CardTitle>
                <CardDescription>{tasksCompleted(totals)} tasks across {monthEntries.length} entries</CardDescription>
              </div>
            </CardHeader>
            {monthEntries.length === 0 ? (
              <CardContent className="pt-0">
                <EmptyState compact icon={Download} title="No entries for this month" description="Logged activities and daily summaries will be listed here." actionLabel={isCurrentMonth ? "Log activity" : undefined} onAction={() => setActiveTab("daily-update")} />
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className={`border-y border-zinc-100 text-xs dark:border-zinc-800 ${muted}`}>
                      <th className="px-5 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Activity</th>
                      <th className="px-3 py-2 font-medium">Details</th>
                      <th className="px-3 py-2 text-right font-medium">Tickets</th>
                      <th className="px-3 py-2 text-right font-medium">Chats</th>
                      <th className="px-3 py-2 text-right font-medium">KYC</th>
                      <th className="px-3 py-2 text-right font-medium">Calls</th>
                      <th className="px-3 py-2 text-right font-medium">Emails</th>
                      <th className="px-5 py-2 text-right font-medium">Training</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {monthEntries.map((e) => (
                      <tr key={e.id} className="align-top hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                        <td className="whitespace-nowrap px-5 py-2 tabular-nums">{formatDate(e.date)}</td>
                        <td className="whitespace-nowrap px-3 py-2">{e.label}</td>
                        <td className="max-w-md px-3 py-2 text-zinc-600 dark:text-zinc-400">
                          <div className="flex flex-wrap items-center gap-1">
                            {e.country && <Badge variant="outline">{e.country}</Badge>}
                            {e.accountId && <Badge variant="outline">MT {e.accountId}</Badge>}
                            {e.ticketCategory && <Badge variant="secondary">{e.ticketCategory}</Badge>}
                            {e.priority && <Badge variant={priorityVariant(e.priority)}>{e.priority}</Badge>}
                            {e.status && <Badge variant={statusVariant(e.status)}>{e.status}</Badge>}
                          </div>
                          {e.description && <p className={cn("line-clamp-2", (e.country || e.accountId) && "mt-1")}>{e.description}</p>}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{e.tickets || "–"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{e.chats || "–"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{e.kyc || "–"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{e.calls || "–"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{e.emails || "–"}</td>
                        <td className="px-5 py-2 text-right tabular-nums">{num(e.trainingHours) ? `${num(e.trainingHours)}h` : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-zinc-200 font-medium dark:border-zinc-700">
                      <td className="px-5 py-2" colSpan={3}>
                        Total
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{totals.tickets}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{totals.chats}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{totals.kyc}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{totals.calls}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{totals.emails}</td>
                      <td className="px-5 py-2 text-right tabular-nums">{totals.trainingHours}h</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
