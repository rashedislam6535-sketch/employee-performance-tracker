"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import type { AttendanceRecord } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { describeDevice, formatDuration, formatTime, toDateStr } from "@/lib/utils";
import { LogIn, LogOut, Coffee, Play, CalendarOff, MapPin, Monitor, Clock } from "lucide-react";

interface Props {
  record: AttendanceRecord | null;
  isWeekend: boolean;
  onChanged: (rec: AttendanceRecord | null) => void;
}

/** Recomputes live durations on the client so the card ticks while working / on break. */
function live(rec: AttendanceRecord, now: number) {
  if (!rec.checkIn) return { working: 0, breakTotal: 0, currentBreak: 0 };
  const start = new Date(rec.checkIn).getTime();
  const end = rec.checkOut ? new Date(rec.checkOut).getTime() : now;
  let breakTotal = 0;
  let currentBreak = 0;
  for (const b of rec.breaks) {
    const bs = new Date(b.startTime).getTime();
    const be = b.endTime ? new Date(b.endTime).getTime() : now;
    const m = Math.max(0, Math.round((be - bs) / 60000));
    breakTotal += m;
    if (!b.endTime) currentBreak = m;
  }
  const working = rec.checkOut ? rec.workingMinutes : Math.max(0, Math.round((end - start) / 60000) - breakTotal);
  return { working, breakTotal, currentBreak };
}

export function AttendanceCard({ record, isWeekend, onChanged }: Props) {
  const { currentUser, toast, confirm } = useApp();
  const [busy, setBusy] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [showWeekendCheckIn, setShowWeekendCheckIn] = useState(false);

  const active = record?.status === "working" || record?.status === "on_break";
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [active]);

  const act = async (action: "check-in" | "check-out" | "break-start" | "break-end") => {
    if (!currentUser) return;
    if (action === "check-out") {
      const ok = await confirm({
        title: "Check out for today?",
        description: "Your working time will be calculated as check-out − check-in − breaks. Any running break is ended automatically.",
        confirmText: "Check out",
      });
      if (!ok) return;
    }
    setBusy(action);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          action,
          date: toDateStr(new Date()),
          location: location.trim() || undefined,
          device: typeof navigator !== "undefined" ? describeDevice(navigator.userAgent) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Attendance", description: json.error || "Something went wrong.", variant: "error" });
        return;
      }
      setNow(Date.now());
      onChanged(json.attendance);
      const msg =
        action === "check-in"
          ? `Checked in at ${formatTime(json.attendance?.checkIn)}`
          : action === "check-out"
            ? `Checked out · worked ${formatDuration(json.attendance?.workingMinutes)}`
            : action === "break-start"
              ? "Break started"
              : "Break ended";
      toast({ title: msg, variant: "success" });
    } finally {
      setBusy(null);
    }
  };

  const l = record ? live(record, now) : null;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Attendance</CardTitle>
          <CardDescription>Working time = check-out − check-in − breaks</CardDescription>
        </div>
        {record?.status === "working" && <Badge variant="success">Working</Badge>}
        {record?.status === "on_break" && <Badge variant="warning">On break</Badge>}
        {record?.status === "checked_out" && <Badge variant="outline">Checked out</Badge>}
        {!record?.checkIn && isWeekend && <Badge variant="info">Weekend</Badge>}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Not checked in */}
        {!record?.checkIn && (
          <>
            {isWeekend && !showWeekendCheckIn ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-md border border-dashed border-zinc-300 px-4 py-8 text-center dark:border-zinc-700">
                <CalendarOff className="mb-2 h-5 w-5 text-zinc-400" strokeWidth={1.75} />
                <p className="text-[13px] font-medium">Weekend</p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">No attendance required</p>
                <Button variant="link" size="sm" className="mt-2" onClick={() => setShowWeekendCheckIn(true)}>
                  Working today? Check in anyway
                </Button>
              </div>
            ) : (
              <div className="flex flex-1 flex-col justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-[13px] text-zinc-600 dark:text-zinc-400">You haven&apos;t checked in yet.</p>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional) — Office, Home…" className="pl-8" maxLength={80} />
                  </div>
                </div>
                <Button size="lg" onClick={() => act("check-in")} loading={busy === "check-in"} className="w-full">
                  <LogIn className="h-4 w-4" /> Check in
                </Button>
              </div>
            )}
          </>
        )}

        {/* Checked in */}
        {record?.checkIn && l && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Checked in</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatTime(record.checkIn)}</p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{record.checkOut ? "Checked out" : "Working time"}</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">{record.checkOut ? formatTime(record.checkOut) : formatDuration(l.working)}</p>
              </div>
              <div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Total break</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums">{formatDuration(l.breakTotal)}</p>
              </div>
            </div>

            {record.checkOut && (
              <div className="rounded-md bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Work duration</p>
                <p className="text-2xl font-semibold tabular-nums tracking-tight">{formatDuration(record.workingMinutes)}</p>
              </div>
            )}

            {(record.device || record.location) && (
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                {record.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {record.location}
                  </span>
                )}
                {record.device && (
                  <span className="inline-flex items-center gap-1">
                    <Monitor className="h-3 w-3" /> {record.device}
                  </span>
                )}
              </p>
            )}

            {/* Breaks */}
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Today&apos;s breaks</p>
              {record.breaks.length === 0 ? (
                <p className="text-xs text-zinc-500">No breaks yet.</p>
              ) : (
                <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                  {record.breaks.map((b, i) => {
                    const mins = b.endTime ? b.durationMinutes : l.currentBreak;
                    return (
                      <li key={b.id} className="flex items-center justify-between px-3 py-1.5 text-xs">
                        <span className="text-zinc-600 dark:text-zinc-400">
                          Break {i + 1} · {formatTime(b.startTime)} – {b.endTime ? formatTime(b.endTime) : "now"}
                        </span>
                        <span className="font-medium tabular-nums">
                          {formatDuration(mins)}
                          {!b.endTime && <span className="ml-1 text-amber-600 dark:text-amber-400">·</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {!record.checkOut && (
              <div className="mt-auto flex flex-col gap-2 sm:flex-row">
                {record.onBreak ? (
                  <Button variant="secondary" onClick={() => act("break-end")} loading={busy === "break-end"} className="flex-1">
                    <Play className="h-4 w-4" /> End break
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => act("break-start")} loading={busy === "break-start"} className="flex-1">
                    <Coffee className="h-4 w-4" /> Start break
                  </Button>
                )}
                <Button onClick={() => act("check-out")} loading={busy === "check-out"} className="flex-1">
                  <LogOut className="h-4 w-4" /> Check out
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function attendanceSummary(rec: AttendanceRecord | null): { working: string; breakTotal: string; sub: string } {
  if (!rec?.checkIn) return { working: "—", breakTotal: "—", sub: "Not checked in" };
  const l = live(rec, Date.now());
  return {
    working: formatDuration(l.working),
    breakTotal: formatDuration(l.breakTotal),
    sub: rec.checkOut ? `${formatTime(rec.checkIn)} – ${formatTime(rec.checkOut)}` : `Since ${formatTime(rec.checkIn)}`,
  };
}

export const ClockIcon = Clock;
