"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import { DailyUpdateForm } from "@/components/DailyUpdateForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input, Textarea, Select, Field, Segmented } from "@/components/ui/input";
import { ACTIVITY_TYPES, ActivityType, KYC_COUNTRIES, PRIORITIES, TICKET_CATEGORIES, TICKET_STATUSES, toDateStr, cn } from "@/lib/utils";
import { ShieldCheck, Ticket, MessageSquare, Phone, Mail, GraduationCap, Users, MoreHorizontal } from "lucide-react";

export interface ActivityValues {
  quantity: string;
  country: string;
  accountId: string;
  ticketCategory: string;
  priority: string;
  status: string;
  description: string;
}

export const emptyActivityValues: ActivityValues = {
  quantity: "",
  country: "",
  accountId: "",
  ticketCategory: "",
  priority: "Medium",
  status: "Pending",
  description: "",
};

const ICONS: Record<ActivityType, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  kyc: ShieldCheck,
  ticket: Ticket,
  chat: MessageSquare,
  call: Phone,
  email: Mail,
  training: GraduationCap,
  meeting: Users,
  other: MoreHorizontal,
};

/** Per-type fields shared by the create form and the edit dialog. */
export function ActivityFields({ type, values, onChange }: { type: ActivityType; values: ActivityValues; onChange: (v: ActivityValues) => void }) {
  const set = (k: keyof ActivityValues, v: string) => onChange({ ...values, [k]: v });

  if (type === "kyc") {
    return (
      <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Number completed">
            <Input type="number" min={1} step={1} inputMode="numeric" value={values.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder="5" required />
          </Field>
          <Field label="Country">
            <Select value={values.country} onChange={(e) => set("country", e.target.value)} required>
              <option value="">Select country…</option>
              {KYC_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Description (optional)">
          <Textarea rows={3} value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="Notes about this batch, e.g. document types or issues found" />
        </Field>
      </>
    );
  }

  if (type === "ticket") {
    return (
      <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="MT Account ID">
            <Input value={values.accountId} onChange={(e) => set("accountId", e.target.value)} placeholder="123456" inputMode="numeric" required />
          </Field>
          <Field label="Ticket type">
            <Select value={values.ticketCategory} onChange={(e) => set("ticketCategory", e.target.value)} required>
              <option value="">Select type…</option>
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Description">
          <Textarea rows={3} value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="What the customer reported and what you did" />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Priority">
            <Segmented value={values.priority} onChange={(v) => set("priority", v)} options={PRIORITIES.map((p) => ({ value: p, label: p }))} />
          </Field>
          <Field label="Status">
            <Segmented value={values.status} onChange={(v) => set("status", v)} options={TICKET_STATUSES.map((s) => ({ value: s, label: s }))} />
          </Field>
        </div>
      </>
    );
  }

  if (type === "chat" || type === "call" || type === "email") {
    const label = type === "chat" ? "Chats handled" : type === "call" ? "Calls made" : "Emails sent";
    return (
      <>
        <Field label={label} className="sm:max-w-xs">
          <Input type="number" min={1} step={1} inputMode="numeric" value={values.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder="0" required />
        </Field>
        <Field label="Description (optional)">
          <Textarea rows={3} value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="Main topics handled" />
        </Field>
      </>
    );
  }

  if (type === "training" || type === "meeting") {
    return (
      <>
        <Field label={type === "training" ? "Training hours" : "Duration (hours)"} className="sm:max-w-xs">
          <Input type="number" min={0} step={0.25} inputMode="decimal" value={values.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder={type === "training" ? "1" : "0.5"} required={type === "training"} />
        </Field>
        <Field label={type === "training" ? "Topic (optional)" : "What was discussed"}>
          <Textarea rows={3} value={values.description} onChange={(e) => set("description", e.target.value)} placeholder={type === "training" ? "AML refresher, platform update…" : "Team sync, action items…"} required={type === "meeting"} />
        </Field>
      </>
    );
  }

  return (
    <>
      <Field label="Description">
        <Textarea rows={3} value={values.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe the work" required />
      </Field>
      <Field label="Quantity (optional)" className="sm:max-w-xs">
        <Input type="number" min={0} step={1} value={values.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder="1" />
      </Field>
    </>
  );
}

export function activityPayload(type: ActivityType, v: ActivityValues) {
  return {
    type,
    quantity: v.quantity === "" ? undefined : Number(v.quantity),
    country: v.country || null,
    accountId: v.accountId || null,
    ticketCategory: v.ticketCategory || null,
    priority: v.priority || null,
    status: v.status || null,
    description: v.description || null,
  };
}

const TYPE_KEY = "workpulse_last_activity_type";

function StructuredForm() {
  const { currentUser, toast, notifyDataChanged, setActiveTab } = useApp();
  const [type, setType] = useState<ActivityType>("kyc");
  const [date, setDate] = useState(toDateStr(new Date()));
  const [values, setValues] = useState<ActivityValues>(emptyActivityValues);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(TYPE_KEY) as ActivityType | null;
    if (saved && ACTIVITY_TYPES.some((t) => t.id === saved)) setType(saved);
  }, []);

  const choose = (t: ActivityType) => {
    setType(t);
    setError("");
    localStorage.setItem(TYPE_KEY, t);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, date, ...activityPayload(type, values) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not save.");
        return;
      }
      const meta = ACTIVITY_TYPES.find((t) => t.id === type)!;
      const what =
        type === "kyc" ? `${values.quantity} KYC · ${values.country}` : type === "ticket" ? `Ticket · MT ${values.accountId} · ${values.ticketCategory}` : `${meta.label}${values.quantity ? ` · ${values.quantity} ${meta.unit}` : ""}`;
      setLastSaved(what);
      toast({ title: "Activity saved", description: what, variant: "success" });
      setValues({ ...emptyActivityValues, priority: "Medium", status: "Pending" });
      notifyDataChanged();
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const meta = ACTIVITY_TYPES.find((t) => t.id === type)!;

  return (
    <form onSubmit={submit}>
      <Card>
        <CardContent className="space-y-5 pt-5">
          {/* Type selector */}
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">Activity</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ACTIVITY_TYPES.map((t) => {
                const Icon = ICONS[t.id];
                const active = t.id === type;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => choose(t.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-[13px] transition-colors",
                      active
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300"
                        : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-400">{meta.hint}</p>
          </div>

          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>
          )}

          <Field label="Date" className="sm:max-w-xs">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>

          <ActivityFields type={type} values={values} onChange={setValues} />
        </CardContent>
        <CardFooter className="justify-between">
          <span className="text-xs text-zinc-500">{lastSaved ? `Last saved: ${lastSaved}` : "Entries update the dashboard immediately."}</span>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <Button type="button" variant="ghost" onClick={() => setActiveTab("timeline")}>
                View timeline
              </Button>
            )}
            <Button type="submit" loading={saving}>
              Save activity
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}

export function LogActivityPage() {
  const [mode, setMode] = useState<"activity" | "summary">("activity");
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Log work</h2>
          <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-zinc-400">
            {mode === "activity" ? "Record one activity at a time with full details." : "Record a whole day's numbers in one entry."}
          </p>
        </div>
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "activity", label: "Activity" },
            { value: "summary", label: "Daily summary" },
          ]}
        />
      </div>
      {mode === "activity" ? <StructuredForm /> : <DailyUpdateForm embedded />}
    </div>
  );
}
