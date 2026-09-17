"use client";

import React, { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { TASK_TYPES, toDateStr } from "@/lib/utils";
import { Paperclip, X } from "lucide-react";

const DRAFT_KEY = "workpulse_update_draft";

const inputCls =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[13px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500";
const labelCls = "mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400";

type Metrics = { tickets: string; chats: string; kyc: string; calls: string; emails: string; trainingHours: string };
const emptyMetrics: Metrics = { tickets: "", chats: "", kyc: "", calls: "", emails: "", trainingHours: "" };

const METRIC_FIELDS: { key: keyof Metrics; label: string; step?: string; placeholder: string }[] = [
  { key: "tickets", label: "Tickets handled", placeholder: "0" },
  { key: "chats", label: "Chats handled", placeholder: "0" },
  { key: "kyc", label: "KYC completed", placeholder: "0" },
  { key: "calls", label: "Calls made", placeholder: "0" },
  { key: "emails", label: "Emails sent", placeholder: "0" },
  { key: "trainingHours", label: "Training hours", step: "0.5", placeholder: "0.0" },
];

export function DailyUpdateForm({ embedded = false }: { embedded?: boolean }) {
  const { currentUser, notifyDataChanged, toast } = useApp();

  const [date, setDate] = useState(toDateStr(new Date()));
  const [taskType, setTaskType] = useState(TASK_TYPES[0]);
  const [description, setDescription] = useState("");
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [attachmentName, setAttachmentName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draftState, setDraftState] = useState<"none" | "restored" | "saved">("none");
  const hydrated = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Restore draft
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.taskType) setTaskType(d.taskType);
        if (d.description) setDescription(d.description);
        if (d.metrics) setMetrics({ ...emptyMetrics, ...d.metrics });
        if (d.description || Object.values(d.metrics || {}).some((v) => v)) setDraftState("restored");
      }
    } catch {}
    hydrated.current = true;
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (!hydrated.current) return;
    const t = setTimeout(() => {
      const hasContent = description.trim() || Object.values(metrics).some((v) => v !== "");
      if (hasContent) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ taskType, description, metrics }));
        setDraftState("saved");
      } else {
        localStorage.removeItem(DRAFT_KEY);
        setDraftState("none");
      }
    }, 600);
    return () => clearTimeout(t);
  }, [taskType, description, metrics]);

  const setMetric = (key: keyof Metrics, value: string) => setMetrics((m) => ({ ...m, [key]: value }));

  const reset = () => {
    setDescription("");
    setMetrics(emptyMetrics);
    setAttachmentName("");
    if (fileRef.current) fileRef.current.value = "";
    localStorage.removeItem(DRAFT_KEY);
    setDraftState("none");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!currentUser) return;
    if (!description.trim()) {
      setError("Add a short description of the work you did.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          date,
          taskType,
          description: description.trim(),
          tickets: Number(metrics.tickets) || 0,
          chats: Number(metrics.chats) || 0,
          kyc: Number(metrics.kyc) || 0,
          calls: Number(metrics.calls) || 0,
          emails: Number(metrics.emails) || 0,
          trainingHours: Number(metrics.trainingHours) || 0,
          attachmentName: attachmentName || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Could not save the update.");
        return;
      }
      reset();
      notifyDataChanged();
      toast({ title: "Daily summary saved", description: `${taskType} · ${date}`, variant: "success" });
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={embedded ? "" : "mx-auto max-w-3xl"}>
      <div className="mb-3 flex items-end justify-between">
        {!embedded ? (
          <div>
            <h2 className="text-xl font-semibold tracking-tight">New work update</h2>
            <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-zinc-400">
              Log one entry per task type. You can add several entries for the same day.
            </p>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">One entry with the day&apos;s totals per task type.</p>
        )}
        <span className="text-xs text-zinc-400">
          {draftState === "saved" && "Draft saved"}
          {draftState === "restored" && "Draft restored"}
        </span>
      </div>

      <form onSubmit={submit} className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-5 p-5">
          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Task type</label>
              <select value={taskType} onChange={(e) => setTaskType(e.target.value)} className={inputCls}>
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Assisted customers regarding payout, account issues, and verification."
              className={`${inputCls} resize-y leading-relaxed`}
            />
          </div>

          <div>
            <label className={labelCls}>Numbers</label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {METRIC_FIELDS.map((f) => (
                <div key={f.key} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  <label htmlFor={`m-${f.key}`} className="block text-[11px] text-zinc-500 dark:text-zinc-400">
                    {f.label}
                  </label>
                  <input
                    id={`m-${f.key}`}
                    type="number"
                    min="0"
                    step={f.step ?? "1"}
                    inputMode="decimal"
                    value={metrics[f.key]}
                    onChange={(e) => setMetric(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="mt-1 w-full bg-transparent text-xl font-semibold tabular-nums outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Attachment</label>
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-[13px] hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                <Paperclip className="h-3.5 w-3.5 text-zinc-500" />
                Choose file
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv,.docx"
                  onChange={(e) => setAttachmentName(e.target.files?.[0]?.name ?? "")}
                />
              </label>
              {attachmentName ? (
                <span className="inline-flex items-center gap-1.5 text-[13px] text-zinc-700 dark:text-zinc-300">
                  {attachmentName}
                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentName("");
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    aria-label="Remove attachment"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ) : (
                <span className="text-xs text-zinc-400">Screenshot or proof, optional</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={reset}
            className="text-[13px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-8 items-center rounded-md bg-indigo-600 px-3.5 text-[13px] font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save update"}
          </button>
        </div>
      </form>

    </div>
  );
}
