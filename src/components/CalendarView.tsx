"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { DailyUpdate } from "@/types";
import { calculateProductivityScore, formatLongDate, formatMonthYear, num, summarizeMetrics, taskColor, toDateStr } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const muted = "text-zinc-500 dark:text-zinc-400";
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarView() {
  const { currentUser, dataVersion, setActiveTab } = useApp();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [updates, setUpdates] = useState<DailyUpdate[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

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

  const byDate = useMemo(() => {
    const map: Record<string, DailyUpdate[]> = {};
    for (const u of updates) (map[u.date] ||= []).push(u);
    return map;
  }, [updates]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
  const todayStr = toDateStr(new Date());

  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const daysLogged = Object.keys(byDate).filter((d) => d.startsWith(monthPrefix)).length;

  const dayTotals = (list: DailyUpdate[]) => {
    const t = { tickets: 0, chats: 0, kyc: 0, calls: 0, emails: 0, trainingHours: 0 };
    for (const u of list) {
      t.tickets += u.tickets;
      t.chats += u.chats;
      t.kyc += u.kyc;
      t.calls += u.calls;
      t.emails += u.emails;
      t.trainingHours += num(u.trainingHours);
    }
    return t;
  };

  const selectedItems = selected ? byDate[selected] || [] : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{formatMonthYear(cursor)}</h2>
          <p className={`text-[13px] ${muted}`}>{daysLogged} days with entries</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="rounded-md border border-zinc-200 p-1.5 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              const d = new Date();
              setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
            }}
            className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-[13px] hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
          >
            Today
          </button>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="rounded-md border border-zinc-200 p-1.5 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
          {DOW.map((d) => (
            <div key={d} className={`px-2 py-1.5 text-[11px] font-medium ${muted}`}>
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((ds, i) => {
            if (!ds) {
              return <div key={`e${i}`} className="min-h-[72px] border-b border-r border-zinc-100 bg-zinc-50/60 dark:border-zinc-800/60 dark:bg-zinc-950/40 sm:min-h-[96px]" />;
            }
            const list = byDate[ds] || [];
            const t = dayTotals(list);
            const score = list.length ? calculateProductivityScore(t) : null;
            const isToday = ds === todayStr;
            const isSelected = ds === selected;
            const dayNum = Number(ds.slice(8, 10));
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
                className={`min-h-[72px] border-b border-r border-zinc-100 p-1.5 text-left align-top transition-colors dark:border-zinc-800/60 sm:min-h-[96px] sm:p-2 ${
                  isSelected ? "bg-indigo-50 dark:bg-indigo-950/30" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] tabular-nums ${
                      isToday ? "bg-indigo-600 font-medium text-white" : "text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {dayNum}
                  </span>
                  {score !== null && <span className={`text-[10px] tabular-nums ${muted}`}>{score}%</span>}
                </div>
                {lines.length > 0 && (
                  <ul className="mt-1 hidden space-y-0.5 sm:block">
                    {lines.slice(0, 3).map((l) => (
                      <li key={l} className="truncate text-[11px] tabular-nums text-zinc-600 dark:text-zinc-400">
                        {l}
                      </li>
                    ))}
                  </ul>
                )}
                {list.length > 0 && (
                  <div className="mt-1 flex gap-0.5 sm:hidden">
                    {Array.from(new Set(list.map((u) => u.taskType))).slice(0, 4).map((tt) => (
                      <span key={tt} className="h-1.5 w-1.5 rounded-full" style={{ background: taskColor(tt) }} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
            <div>
              <h3 className="text-[13px] font-medium">{formatLongDate(selected)}</h3>
              <p className={`text-xs ${muted}`}>
                {selectedItems.length === 0 ? "No entries" : `${selectedItems.length} ${selectedItems.length === 1 ? "entry" : "entries"} · score ${calculateProductivityScore(dayTotals(selectedItems))}%`}
              </p>
            </div>
            {selectedItems.length === 0 && selected <= todayStr && (
              <button onClick={() => setActiveTab("daily-update")} className="text-[13px] text-indigo-600 hover:underline dark:text-indigo-400">
                Add entry
              </button>
            )}
          </div>
          {selectedItems.length > 0 && (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {selectedItems.map((u) => (
                <li key={u.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: taskColor(u.taskType) }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-[13px] font-medium">{u.taskType}</span>
                      <span className={`text-xs tabular-nums ${muted}`}>{summarizeMetrics(u)}</span>
                    </div>
                    <p className="mt-0.5 text-[13px] text-zinc-700 dark:text-zinc-300">{u.description}</p>
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
