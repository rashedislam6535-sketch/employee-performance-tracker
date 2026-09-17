"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import type { Entry, AttendanceRecord } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge, priorityVariant, statusVariant } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration, formatLongDate, formatMonthYear, formatTime, isWeekend, productivityScore, summarizeMetrics, taskColor, toDateStr, emptyTotals, cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const muted = "text-zinc-500 dark:text-zinc-400";
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dayTotals(list: Entry[]) {
  const t = emptyTotals();
  for (const u of list) {
    t.tickets += u.tickets;
    t.chats += u.chats;
    t.kyc += u.kyc;
    t.calls += u.calls;
    t.emails += u.emails;
    t.trainingHours += u.trainingHours;
  }
  return t;
}

export function CalendarView() {
  const { currentUser, dataVersion, setActiveTab } = useApp();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [entries, setEntries] = useState<Entry[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

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

  const byDate = useMemo(() => {
    const map: Record<string, Entry[]> = {};
    for (const u of entries) (map[u.date] ||= []).push(u);
    return map;
  }, [entries]);
  const attByDate = useMemo(() => Object.fromEntries(attendance.map((a) => [a.date, a])), [attendance]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (new Date(year, month, 1).getDay() + 6) % 7;
  const todayStr = toDateStr(new Date());

  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const daysLogged = Object.keys(byDate).filter((d) => d.startsWith(monthPrefix)).length;
  const selectedItems = selected ? byDate[selected] || [] : [];
  const selectedAtt = selected ? attByDate[selected] : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{formatMonthYear(cursor)}</h2>
          <p className={`text-[13px] ${muted}`}>{daysLogged} days with entries · weekends shaded</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const d = new Date();
              setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
            }}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-[520px]" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
            {DOW.map((d, i) => (
              <div key={d} className={cn("px-2 py-1.5 text-[11px] font-medium", i >= 5 ? "text-zinc-400 dark:text-zinc-500" : muted)}>
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((ds, i) => {
              if (!ds) return <div key={`e${i}`} className="min-h-[72px] border-b border-r border-zinc-100 bg-zinc-50/60 dark:border-zinc-800/60 dark:bg-zinc-950/40 sm:min-h-[100px]" />;
              const list = byDate[ds] || [];
              const t = dayTotals(list);
              const score = list.length ? productivityScore(t) : null;
              const weekend = isWeekend(ds);
              const isToday = ds === todayStr;
              const isSelected = ds === selected;
              const att = attByDate[ds];
              const lines: string[] = [];
              if (t.kyc) lines.push(`KYC ${t.kyc}`);
              if (t.tickets) lines.push(`Tickets ${t.tickets}`);
              if (t.chats) lines.push(`Chats ${t.chats}`);
              if (t.calls) lines.push(`Calls ${t.calls}`);
              if (t.emails && lines.length < 3) lines.push(`Emails ${t.emails}`);

              return (
                <button
                  key={ds}
                  onClick={() => setSelected(isSelected ? null : ds)}
                  className={cn(
                    "min-h-[72px] border-b border-r border-zinc-100 p-1.5 text-left align-top transition-colors dark:border-zinc-800/60 sm:min-h-[100px] sm:p-2",
                    weekend && !isSelected && "bg-zinc-50/80 dark:bg-zinc-950/50",
                    isSelected ? "bg-indigo-50 dark:bg-indigo-950/30" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] tabular-nums", isToday ? "bg-indigo-600 font-medium text-white" : weekend ? "text-zinc-400" : "text-zinc-700 dark:text-zinc-300")}>
                      {Number(ds.slice(8, 10))}
                    </span>
                    <span className={`text-[10px] tabular-nums ${muted}`}>
                      {score !== null ? `${score}%` : weekend && !list.length ? <span className="hidden sm:inline">Weekend</span> : ""}
                    </span>
                  </div>
                  {att?.checkIn && (
                    <p className="mt-1 hidden text-[10px] tabular-nums text-emerald-600 dark:text-emerald-400 sm:block">
                      {att.status === "checked_out" ? formatDuration(att.workingMinutes) : `In since ${formatTime(att.checkIn)}`}
                    </p>
                  )}
                  {lines.length > 0 && (
                    <ul className="mt-0.5 hidden space-y-0.5 sm:block">
                      {lines.slice(0, 3).map((l) => (
                        <li key={l} className="truncate text-[11px] tabular-nums text-zinc-600 dark:text-zinc-400">
                          {l}
                        </li>
                      ))}
                    </ul>
                  )}
                  {list.length > 0 && (
                    <div className="mt-1 flex gap-0.5 sm:hidden">
                      {Array.from(new Set(list.map((u) => u.label))).slice(0, 4).map((tt) => (
                        <span key={tt} className="h-1.5 w-1.5 rounded-full" style={{ background: taskColor(tt) }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selected && (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <div>
              <h3 className="flex items-center gap-2 text-[13px] font-medium">
                {formatLongDate(selected)}
                {isWeekend(selected) && <Badge variant="info">Weekend · no attendance required</Badge>}
              </h3>
              <p className={`text-xs ${muted}`}>
                {selectedItems.length === 0 ? "No entries" : `${selectedItems.length} ${selectedItems.length === 1 ? "entry" : "entries"} · score ${productivityScore(dayTotals(selectedItems))}%`}
                {selectedAtt?.checkIn && (
                  <>
                    {" "}
                    · {formatTime(selectedAtt.checkIn)} – {selectedAtt.checkOut ? formatTime(selectedAtt.checkOut) : "now"}
                    {selectedAtt.breakMinutes ? ` · ${formatDuration(selectedAtt.breakMinutes)} break` : ""}
                    {selectedAtt.status === "checked_out" ? ` · ${formatDuration(selectedAtt.workingMinutes)} worked` : ""}
                  </>
                )}
              </p>
            </div>
            {selectedItems.length === 0 && selected <= todayStr && (
              <Button variant="link" size="sm" onClick={() => setActiveTab("daily-update")}>
                Add entry
              </Button>
            )}
          </div>
          {selectedItems.length > 0 && (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {selectedItems.map((u) => (
                <li key={u.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: taskColor(u.label) }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[13px] font-medium">{u.label}</span>
                      {u.country && <Badge variant="outline">{u.country}</Badge>}
                      {u.accountId && <Badge variant="outline">MT {u.accountId}</Badge>}
                      {u.ticketCategory && <Badge variant="secondary">{u.ticketCategory}</Badge>}
                      {u.priority && <Badge variant={priorityVariant(u.priority)}>{u.priority}</Badge>}
                      {u.status && <Badge variant={statusVariant(u.status)}>{u.status}</Badge>}
                      <span className={`text-xs tabular-nums ${muted}`}>{summarizeMetrics(u)}</span>
                    </div>
                    {u.description && <p className="mt-0.5 text-[13px] text-zinc-700 dark:text-zinc-300">{u.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
