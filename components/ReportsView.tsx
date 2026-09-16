"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { ReportItem } from "@/types";
import { addDays, downloadFile, formatDate, toDateStr } from "@/lib/utils";
import { Copy, Check, Download, Printer, Trash2, FileText } from "lucide-react";

const muted = "text-zinc-500 dark:text-zinc-400";
const card = "rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";
const btn =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-[13px] font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800";

type Period = "thisWeek" | "lastWeek" | "last7" | "thisMonth";

function ReportSection({
  title,
  value,
  editing,
  onChange,
}: {
  title: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <section>
      <h4 className="mb-1.5 text-[13px] font-semibold">{title}</h4>
      {editing ? (
        <textarea
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      ) : (
        <p className="whitespace-pre-line text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">{value || "—"}</p>
      )}
    </section>
  );
}

function periodRange(p: Period): { start: string; end: string } {
  const today = new Date();
  const monday = addDays(today, -((today.getDay() + 6) % 7));
  switch (p) {
    case "thisWeek":
      return { start: toDateStr(monday), end: toDateStr(today) };
    case "lastWeek":
      return { start: toDateStr(addDays(monday, -7)), end: toDateStr(addDays(monday, -1)) };
    case "thisMonth":
      return { start: toDateStr(new Date(today.getFullYear(), today.getMonth(), 1)), end: toDateStr(today) };
    default:
      return { start: toDateStr(addDays(today, -6)), end: toDateStr(today) };
  }
}

export function ReportsView() {
  const { currentUser } = useApp();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [period, setPeriod] = useState<Period>("thisWeek");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ keyAchievements: "", tasksInProgress: "", nextWeekPlan: "" });

  const userId = currentUser?.id;
  const active = reports.find((r) => r.id === activeId) ?? null;

  const load = useCallback(async () => {
    if (!userId) return;
    const res = await fetch(`/api/reports?userId=${userId}`);
    if (res.ok) {
      const data = await res.json();
      const list: ReportItem[] = data.reports || [];
      setReports(list);
      setActiveId((cur) => (cur && list.some((r) => r.id === cur) ? cur : list[0]?.id ?? null));
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (active) {
      setDraft({
        keyAchievements: active.keyAchievements || "",
        tasksInProgress: active.tasksInProgress || "",
        nextWeekPlan: active.nextWeekPlan || "",
      });
      setEditing(false);
    }
  }, [activeId, active]);

  const generate = async () => {
    if (!userId) return;
    setGenerating(true);
    try {
      const { start, end } = periodRange(period);
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, weekStart: start, weekEnd: end }),
      });
      if (res.ok) {
        const json = await res.json();
        setReports((prev) => [json.report, ...prev]);
        setActiveId(json.report.id);
      }
    } finally {
      setGenerating(false);
    }
  };

  const saveEdits = async () => {
    if (!active) return;
    setSaving(true);
    try {
      const res = await fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: active.id, ...draft }),
      });
      if (res.ok) {
        setReports((prev) => prev.map((r) => (r.id === active.id ? { ...r, ...draft } : r)));
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this report?")) return;
    const res = await fetch(`/api/reports?id=${id}`, { method: "DELETE" });
    if (res.ok) setReports((prev) => prev.filter((r) => r.id !== id));
  };

  const plainText = () => {
    if (!active) return "";
    return [
      `Weekly Report — ${currentUser?.name}`,
      `Period: ${formatDate(active.weekStart)} to ${formatDate(active.weekEnd)}`,
      "",
      active.content,
      "",
      "Key Achievements:",
      draft.keyAchievements,
      "",
      "Tasks In Progress:",
      draft.tasksInProgress,
      "",
      "Next Week Plan:",
      draft.nextWeekPlan,
    ].join("\n");
  };

  const copy = async () => {
    await navigator.clipboard.writeText(plainText());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const downloadDoc = () => {
    if (!active) return;
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Weekly Report</title>
<style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#111;line-height:1.5;margin:48px}h1{font-size:18pt;margin:0 0 4px}h2{font-size:12pt;margin:20px 0 6px;border-bottom:1px solid #ddd;padding-bottom:3px}.meta{color:#555;margin-bottom:16px}p{margin:0 0 8px}</style></head><body>
<h1>Weekly Report</h1>
<div class="meta">${esc(currentUser?.name || "")} · ${esc(currentUser?.department || "")}<br/>${formatDate(active.weekStart)} – ${formatDate(active.weekEnd)}</div>
<p>${esc(active.content)}</p>
<h2>Key Achievements</h2><p>${esc(draft.keyAchievements)}</p>
<h2>Tasks In Progress</h2><p>${esc(draft.tasksInProgress)}</p>
<h2>Next Week Plan</h2><p>${esc(draft.nextWeekPlan)}</p>
</body></html>`;
    downloadFile(`weekly-report-${active.weekStart}.doc`, html, "application/msword;charset=utf-8");
  };

  const downloadMd = () => {
    if (!active) return;
    const md = `# Weekly Report — ${currentUser?.name}\n\n**Period:** ${formatDate(active.weekStart)} – ${formatDate(active.weekEnd)}\n\n${active.content}\n\n## Key Achievements\n${draft.keyAchievements}\n\n## Tasks In Progress\n${draft.tasksInProgress}\n\n## Next Week Plan\n${draft.nextWeekPlan}\n`;
    downloadFile(`weekly-report-${active.weekStart}.md`, md, "text/markdown;charset=utf-8");
  };

  const snapshot = (() => {
    try {
      return active?.metricsSnapshot ? JSON.parse(active.metricsSnapshot) : null;
    } catch {
      return null;
    }
  })();

  const sectionProps = (field: keyof typeof draft) => ({
    value: draft[field],
    editing,
    onChange: (v: string) => setDraft((d) => ({ ...d, [field]: v })),
  });

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-[13px] ${muted}`}>Reports are built from your logged updates. Edit the text before you download it.</p>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="h-8 rounded-md border border-zinc-200 bg-white px-2.5 text-[13px] outline-none dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="thisWeek">This week</option>
            <option value="lastWeek">Last week</option>
            <option value="last7">Last 7 days</option>
            <option value="thisMonth">This month</option>
          </select>
          <button
            onClick={generate}
            disabled={generating}
            className="inline-flex h-8 items-center rounded-md bg-indigo-600 px-3 text-[13px] font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {generating ? "Generating…" : "Generate report"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={`no-print ${card} self-start`}>
          <div className="border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
            <h3 className="text-[13px] font-medium">Saved reports</h3>
          </div>
          {reports.length === 0 ? (
            <p className={`px-4 py-8 text-center text-[13px] ${muted}`}>No reports yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {reports.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => setActiveId(r.id)}
                    className={`flex w-full items-start gap-2.5 px-4 py-2.5 text-left ${
                      r.id === activeId ? "bg-zinc-100 dark:bg-zinc-800/60" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    }`}
                  >
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" strokeWidth={1.75} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">
                        {formatDate(r.weekStart)} – {formatDate(r.weekEnd)}
                      </p>
                      <p className={`text-xs ${muted}`}>Generated {formatDate(String(r.createdAt).slice(0, 10))}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`${card} lg:col-span-2`}>
          {!active ? (
            <div className={`px-6 py-16 text-center text-[13px] ${muted}`}>Choose a period and click “Generate report”.</div>
          ) : (
            <>
              <div className="no-print flex flex-wrap items-center gap-2 border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
                {editing ? (
                  <>
                    <button onClick={saveEdits} disabled={saving} className="inline-flex h-8 items-center rounded-md bg-indigo-600 px-3 text-[13px] font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setDraft({
                          keyAchievements: active.keyAchievements || "",
                          tasksInProgress: active.tasksInProgress || "",
                          nextWeekPlan: active.nextWeekPlan || "",
                        });
                      }}
                      className={btn}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button onClick={() => setEditing(true)} className={btn}>
                    Edit
                  </button>
                )}
                <button onClick={copy} className={btn}>
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button onClick={downloadDoc} className={btn}>
                  <Download className="h-3.5 w-3.5" />
                  Word (.doc)
                </button>
                <button onClick={downloadMd} className={btn}>
                  <Download className="h-3.5 w-3.5" />
                  Markdown
                </button>
                <button onClick={() => window.print()} className={btn}>
                  <Printer className="h-3.5 w-3.5" />
                  PDF
                </button>
                <button onClick={() => remove(active.id)} className="ml-auto rounded-md p-1.5 text-zinc-400 hover:text-rose-600" title="Delete report" aria-label="Delete report">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-6 px-6 py-6">
                <header>
                  <h2 className="text-lg font-semibold tracking-tight">Weekly Report</h2>
                  <p className={`text-[13px] ${muted}`}>
                    {currentUser?.name} · {currentUser?.department} · {formatDate(active.weekStart)} – {formatDate(active.weekEnd)}
                  </p>
                </header>

                {snapshot && (
                  <dl className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                    {[
                      ["Tickets", snapshot.totalTickets],
                      ["Chats", snapshot.totalChats],
                      ["KYC", snapshot.totalKyc],
                      ["Calls", snapshot.totalCalls],
                      ["Emails", snapshot.totalEmails],
                      ["Training", `${snapshot.trainingHours ?? 0}h`],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                        <dt className={`text-[11px] ${muted}`}>{label}</dt>
                        <dd className="text-base font-semibold tabular-nums">{value ?? 0}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                <p className="text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">{active.content}</p>

                <ReportSection title="Key Achievements" {...sectionProps("keyAchievements")} />
                <ReportSection title="Tasks In Progress" {...sectionProps("tasksInProgress")} />
                <ReportSection title="Next Week Plan" {...sectionProps("nextWeekPlan")} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
