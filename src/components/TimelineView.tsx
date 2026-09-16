"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import { DailyUpdate } from "@/types";
import { addDays, formatLongDate, num, parseDateStr, summarizeMetrics, taskColor, toDateStr } from "@/lib/utils";
import { Search, Paperclip, Trash2, X } from "lucide-react";

type Range = "today" | "week" | "month" | "all";
const RANGES: { id: Range; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "all", label: "All" },
];

const muted = "text-zinc-500 dark:text-zinc-400";

export function TimelineView() {
  const { currentUser, searchQuery, setSearchQuery, dataVersion, notifyDataChanged } = useApp();
  const [updates, setUpdates] = useState<DailyUpdate[]>([]);
  const [range, setRange] = useState<Range>("week");
  const [search, setSearch] = useState(searchQuery);
  const [loading, setLoading] = useState(true);

  const userId = currentUser?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/updates?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUpdates(data.updates || []);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load, dataVersion]);

  useEffect(() => {
    setSearch(searchQuery);
    if (searchQuery) setRange("all");
  }, [searchQuery]);

  const filtered = useMemo(() => {
    const today = new Date();
    const todayStr = toDateStr(today);
    const weekStart = toDateStr(addDays(today, -((today.getDay() + 6) % 7))); // Monday
    const monthStart = todayStr.slice(0, 7) + "-01";
    const q = search.trim().toLowerCase();

    return updates.filter((u) => {
      if (range === "today" && u.date !== todayStr) return false;
      if (range === "week" && u.date < weekStart) return false;
      if (range === "month" && u.date < monthStart) return false;
      if (q && !(u.taskType.toLowerCase().includes(q) || u.description.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [updates, range, search]);

  const totals = useMemo(() => {
    const t = { tickets: 0, chats: 0, kyc: 0, calls: 0, emails: 0, trainingHours: 0 };
    for (const u of filtered) {
      t.tickets += u.tickets;
      t.chats += u.chats;
      t.kyc += u.kyc;
      t.calls += u.calls;
      t.emails += u.emails;
      t.trainingHours += num(u.trainingHours);
    }
    return t;
  }, [filtered]);

  const grouped = useMemo(() => {
    const map: Record<string, DailyUpdate[]> = {};
    for (const u of filtered) (map[u.date] ||= []).push(u);
    return Object.keys(map)
      .sort((a, b) => parseDateStr(b).getTime() - parseDateStr(a).getTime())
      .map((date) => ({ date, items: map[date] }));
  }, [filtered]);

  const remove = async (id: number) => {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/updates?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setUpdates((prev) => prev.filter((u) => u.id !== id));
      notifyDataChanged();
    }
  };

  const todayStr = toDateStr(new Date());
  const yesterdayStr = toDateStr(addDays(new Date(), -1));
  const dayLabel = (d: string) => (d === todayStr ? "Today" : d === yesterdayStr ? "Yesterday" : formatLongDate(d));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`rounded px-3 py-1 text-[13px] transition-colors ${
                range === r.id
                  ? "bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search descriptions or task types"
            className="h-8 w-full rounded-md border border-zinc-200 bg-white pl-8 pr-8 text-[13px] outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-zinc-600"
          />
          {search && (
            <button
              onClick={() => {
                setSearch("");
                setSearchQuery("");
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <p className={`text-[13px] tabular-nums ${muted}`}>
        {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
        {filtered.length > 0 && (
          <>
            {" "}
            · {totals.tickets} tickets · {totals.chats} chats · {totals.kyc} KYC · {totals.calls} calls · {totals.emails} emails
            {totals.trainingHours > 0 && <> · {Number(totals.trainingHours.toFixed(1))}h training</>}
          </>
        )}
      </p>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className={`rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center text-[13px] dark:border-zinc-700 ${muted}`}>
          {search ? "Nothing matches your search." : "No entries in this period."}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ date, items }) => (
            <section key={date}>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-[13px] font-medium">{dayLabel(date)}</h3>
                <span className={`text-xs ${muted}`}>
                  {items.length} {items.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {items.map((u) => (
                    <li key={u.id} className="group flex items-start gap-3 px-4 py-3">
                      <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: taskColor(u.taskType) }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="text-[13px] font-medium">{u.taskType}</span>
                          <span className={`text-xs tabular-nums ${muted}`}>{summarizeMetrics(u)}</span>
                        </div>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">{u.description}</p>
                        {u.attachmentName && (
                          <span className={`mt-1 inline-flex items-center gap-1 text-xs ${muted}`}>
                            <Paperclip className="h-3 w-3" />
                            {u.attachmentName}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => remove(u.id)}
                        className="rounded p-1 text-zinc-400 opacity-0 transition-opacity hover:text-rose-600 group-hover:opacity-100 focus:opacity-100"
                        title="Delete entry"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
