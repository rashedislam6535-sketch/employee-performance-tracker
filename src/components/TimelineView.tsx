"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/context/AppContext";
import type { Entry } from "@/types";
import { EntryEditDialog } from "@/components/EntryEditDialog";
import { Button } from "@/components/ui/button";
import { Badge, priorityVariant, statusVariant } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { ListSkeleton, EmptyState } from "@/components/ui/skeleton";
import { ACTIVITY_TYPES, addDays, formatLongDate, isWeekend, parseDateStr, startOfWeek, summarizeMetrics, taskColor, toDateStr, tasksCompleted, num, cn } from "@/lib/utils";
import { Search, Paperclip, Trash2, X, Pencil, ClipboardList } from "lucide-react";

type Range = "today" | "week" | "month" | "all";
const RANGES: { id: Range; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "all", label: "All" },
];

const muted = "text-zinc-500 dark:text-zinc-400";

export function TimelineView() {
  const { currentUser, searchQuery, setSearchQuery, dataVersion, notifyDataChanged, confirm, toast, setActiveTab } = useApp();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [range, setRange] = useState<Range>("week");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState(searchQuery);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Entry | null>(null);

  const userId = currentUser?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/entries?userId=${userId}`);
      if (res.ok) setEntries((await res.json()).entries || []);
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
    const weekStart = toDateStr(startOfWeek(today));
    const monthStart = todayStr.slice(0, 7) + "-01";
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (range === "today" && e.date !== todayStr) return false;
      if (range === "week" && e.date < weekStart) return false;
      if (range === "month" && e.date < monthStart) return false;
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (q) {
        const hay = [e.label, e.description, e.country, e.accountId, e.ticketCategory, e.priority, e.status].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, range, typeFilter, search]);

  const totals = useMemo(() => {
    const t = { tickets: 0, chats: 0, kyc: 0, calls: 0, emails: 0, trainingHours: 0 };
    for (const e of filtered) {
      t.tickets += e.tickets;
      t.chats += e.chats;
      t.kyc += e.kyc;
      t.calls += e.calls;
      t.emails += e.emails;
      t.trainingHours += e.trainingHours;
    }
    return t;
  }, [filtered]);

  const grouped = useMemo(() => {
    const map: Record<string, Entry[]> = {};
    for (const e of filtered) (map[e.date] ||= []).push(e);
    return Object.keys(map)
      .sort((a, b) => parseDateStr(b).getTime() - parseDateStr(a).getTime())
      .map((date) => ({ date, items: map[date] }));
  }, [filtered]);

  const remove = async (e: Entry) => {
    const ok = await confirm({ title: "Delete this entry?", description: `${e.label} on ${formatLongDate(e.date)}. This cannot be undone.`, confirmText: "Delete", destructive: true });
    if (!ok) return;
    const url = e.source === "activity" ? `/api/activities?id=${e.rawId}` : `/api/updates?id=${e.rawId}`;
    const res = await fetch(url, { method: "DELETE" });
    if (res.ok) {
      setEntries((prev) => prev.filter((x) => x.id !== e.id));
      toast({ title: "Entry deleted" });
      notifyDataChanged();
    } else {
      toast({ title: "Could not delete entry", variant: "error" });
    }
  };

  const todayStr = toDateStr(new Date());
  const yesterdayStr = toDateStr(addDays(new Date(), -1));
  const dayLabel = (d: string) => (d === todayStr ? "Today" : d === yesterdayStr ? "Yesterday" : formatLongDate(d));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex self-start rounded-md border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-900">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={cn(
                "rounded px-3 py-1 text-[13px] transition-colors",
                range === r.id ? "bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-8 sm:w-44">
            <option value="all">All types</option>
            {ACTIVITY_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
            <option value="support">Customer Support</option>
            <option value="hubspot">HubSpot</option>
          </Select>
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search description, MT ID, country…" className="h-8 pl-8 pr-8" />
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
      </div>

      {!loading && (
        <p className={`text-[13px] tabular-nums ${muted}`}>
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
          {filtered.length > 0 && (
            <>
              {" "}
              · {tasksCompleted(totals)} tasks · {totals.tickets} tickets · {totals.chats} chats · {totals.kyc} KYC · {totals.calls} calls · {totals.emails} emails
              {totals.trainingHours > 0 && <> · {Number(totals.trainingHours.toFixed(1))}h training</>}
            </>
          )}
        </p>
      )}

      {loading ? (
        <ListSkeleton rows={5} />
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={search || typeFilter !== "all" ? "Nothing matches these filters" : "No entries in this period"}
          description={search || typeFilter !== "all" ? "Try a different search term or type." : "Activities you log will show up here grouped by day."}
          actionLabel={search || typeFilter !== "all" ? "Clear filters" : "Log activity"}
          onAction={() => {
            if (search || typeFilter !== "all") {
              setSearch("");
              setSearchQuery("");
              setTypeFilter("all");
            } else setActiveTab("daily-update");
          }}
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(({ date, items }) => {
            const dayTotals = { tickets: 0, chats: 0, kyc: 0, calls: 0, emails: 0 };
            for (const i of items) {
              dayTotals.tickets += i.tickets;
              dayTotals.chats += i.chats;
              dayTotals.kyc += i.kyc;
              dayTotals.calls += i.calls;
              dayTotals.emails += i.emails;
            }
            return (
              <section key={date}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-[13px] font-medium">
                    {dayLabel(date)}
                    {isWeekend(date) && <Badge variant="info">Weekend</Badge>}
                  </h3>
                  <span className={`text-xs tabular-nums ${muted}`}>
                    {items.length} {items.length === 1 ? "entry" : "entries"} · {tasksCompleted(dayTotals)} tasks
                  </span>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {items.map((e) => (
                      <li key={e.id} className="group flex items-start gap-3 px-4 py-3">
                        <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: taskColor(e.label) }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-[13px] font-medium">{e.label}</span>
                            {e.type === "kyc" && e.quantity !== null && (
                              <span className={`text-xs ${muted}`}>
                                Completed: <span className="font-medium text-zinc-800 dark:text-zinc-200">{num(e.quantity)}</span>
                              </span>
                            )}
                            {e.country && <Badge variant="outline">Country: {e.country}</Badge>}
                            {e.accountId && <Badge variant="outline">MT ID: {e.accountId}</Badge>}
                            {e.ticketCategory && <Badge variant="secondary">{e.ticketCategory}</Badge>}
                            {e.priority && <Badge variant={priorityVariant(e.priority)}>{e.priority}</Badge>}
                            {e.status && <Badge variant={statusVariant(e.status)}>{e.status}</Badge>}
                            {e.source === "update" && <span className={`text-xs tabular-nums ${muted}`}>{summarizeMetrics(e)}</span>}
                            {e.source === "activity" && !["kyc", "ticket"].includes(e.type) && e.quantity !== null && num(e.quantity) > 0 && (
                              <span className={`text-xs tabular-nums ${muted}`}>{summarizeMetrics(e) || `${num(e.quantity)} ${ACTIVITY_TYPES.find((t) => t.id === e.type)?.unit ?? ""}`}</span>
                            )}
                          </div>
                          {e.description && <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">{e.description}</p>}
                          {e.attachmentName && (
                            <span className={`mt-1 inline-flex items-center gap-1 text-xs ${muted}`}>
                              <Paperclip className="h-3 w-3" />
                              {e.attachmentName}
                            </span>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <Button variant="ghost" size="icon-sm" onClick={() => setEditing(e)} title="Edit entry" aria-label="Edit entry">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => remove(e)} title="Delete entry" aria-label="Delete entry" className="hover:text-rose-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <EntryEditDialog
        entry={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          load();
          notifyDataChanged();
        }}
      />
    </div>
  );
}
