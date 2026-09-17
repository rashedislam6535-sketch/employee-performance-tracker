"use client";

import React, { useEffect, useState } from "react";
import { useApp } from "@/context/AppContext";
import type { Entry } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { ActivityFields, ActivityValues, activityPayload, emptyActivityValues } from "@/components/ActivityLogForm";
import { ActivityType, ACTIVITY_TYPES, TASK_TYPES, METRIC_KEYS, METRIC_LABELS, activityLabel } from "@/lib/utils";

interface Props {
  entry: Entry | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EntryEditDialog({ entry, onClose, onSaved }: Props) {
  const { toast } = useApp();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  // activity
  const [type, setType] = useState<ActivityType>("kyc");
  const [values, setValues] = useState<ActivityValues>(emptyActivityValues);
  // legacy summary
  const [taskType, setTaskType] = useState(TASK_TYPES[0]);
  const [description, setDescription] = useState("");
  const [counters, setCounters] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!entry) return;
    setError("");
    setDate(entry.date);
    if (entry.source === "activity") {
      setType((ACTIVITY_TYPES.some((t) => t.id === entry.type) ? entry.type : "other") as ActivityType);
      setValues({
        quantity: entry.quantity !== null ? String(entry.quantity) : "",
        country: entry.country ?? "",
        accountId: entry.accountId ?? "",
        ticketCategory: entry.ticketCategory ?? "",
        priority: entry.priority ?? "Medium",
        status: entry.status ?? "Pending",
        description: entry.description ?? "",
      });
    } else {
      setTaskType(entry.label);
      setDescription(entry.description);
      setCounters(Object.fromEntries(METRIC_KEYS.map((k) => [k, String(entry[k] || "")])));
    }
  }, [entry]);

  if (!entry) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res =
        entry.source === "activity"
          ? await fetch("/api/activities", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: entry.rawId, date, ...activityPayload(type, values) }),
            })
          : await fetch("/api/updates", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: entry.rawId,
                date,
                taskType,
                description,
                ...Object.fromEntries(METRIC_KEYS.map((k) => [k, Number(counters[k]) || 0])),
              }),
            });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not save changes.");
        return;
      }
      toast({ title: "Entry updated", variant: "success" });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl" onClose={onClose}>
        <form onSubmit={save}>
          <DialogHeader>
            <DialogTitle>Edit entry</DialogTitle>
            <DialogDescription>{entry.source === "activity" ? activityLabel(entry.type) : `${entry.label} · daily summary`}</DialogDescription>
          </DialogHeader>

          {error && (
            <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">{error}</div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Date">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </Field>
              {entry.source === "activity" ? (
                <Field label="Activity">
                  <Select value={type} onChange={(e) => setType(e.target.value as ActivityType)}>
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : (
                <Field label="Task type">
                  <Select value={taskType} onChange={(e) => setTaskType(e.target.value)}>
                    {TASK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>

            {entry.source === "activity" ? (
              <ActivityFields type={type} values={values} onChange={setValues} />
            ) : (
              <>
                <Field label="Description">
                  <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} required />
                </Field>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {METRIC_KEYS.map((k) => (
                    <Field key={k} label={k === "trainingHours" ? "Training hours" : METRIC_LABELS[k]}>
                      <Input
                        type="number"
                        min={0}
                        step={k === "trainingHours" ? 0.5 : 1}
                        value={counters[k] ?? ""}
                        onChange={(e) => setCounters((c) => ({ ...c, [k]: e.target.value }))}
                        placeholder="0"
                      />
                    </Field>
                  ))}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
