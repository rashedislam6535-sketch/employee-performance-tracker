"use client";

import React, { useEffect, useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import type { EmployeeProfile } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Field } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/Navigation";
import { AVAILABILITY_OPTIONS, BLOOD_GROUPS, availabilityMeta, cn } from "@/lib/utils";
import { Camera, Trash2, Upload } from "lucide-react";

/** Resizes an image file to a square JPEG data URL (max 256px) so it stays small in the database. */
async function fileToDataUrl(file: File, size = 256): Promise<string> {
  const bitmap = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read the image."));
    img.src = URL.createObjectURL(file);
  });
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  URL.revokeObjectURL(bitmap.src);
  return canvas.toDataURL("image/jpeg", 0.85);
}

type FormState = Omit<EmployeeProfile, "id" | "userId" | "photo" | "availability">;

export function ProfileView() {
  const { currentUser, employee, setEmployee, setCurrentUser, toast, confirm } = useApp();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [availBusy, setAvailBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!employee) return;
    setForm({
      name: employee.name,
      nickname: employee.nickname ?? "",
      dob: employee.dob ?? "",
      phone: employee.phone ?? "",
      bloodGroup: employee.bloodGroup ?? "",
      email: employee.email ?? "",
      department: employee.department ?? "",
      designation: employee.designation ?? "",
      employeeCode: employee.employeeCode ?? "",
    });
  }, [employee?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = async (body: Record<string, unknown>) => {
    if (!currentUser) return null;
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id, ...body }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Request failed");
    if (json.employee) setEmployee(json.employee);
    if (json.user) setCurrentUser(json.user);
    return json.employee as EmployeeProfile;
  };

  const saveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      await patch({ ...form, dob: form.dob || null });
      toast({ title: "Profile saved", variant: "success" });
    } catch (err: any) {
      toast({ title: "Could not save profile", description: err.message, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please choose an image file", variant: "error" });
      return;
    }
    setPhotoBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      await patch({ photo: dataUrl });
      toast({ title: employee?.photo ? "Photo replaced" : "Photo uploaded", variant: "success" });
    } catch (err: any) {
      toast({ title: "Could not upload photo", description: err.message, variant: "error" });
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePhoto = async () => {
    const ok = await confirm({ title: "Remove profile photo?", confirmText: "Remove", destructive: true });
    if (!ok) return;
    setPhotoBusy(true);
    try {
      await patch({ photo: null });
      toast({ title: "Photo removed" });
    } catch (err: any) {
      toast({ title: "Could not remove photo", description: err.message, variant: "error" });
    } finally {
      setPhotoBusy(false);
    }
  };

  const setAvailability = async (id: string) => {
    if (!employee || employee.availability === id) return;
    setAvailBusy(id);
    try {
      await patch({ availability: id });
      toast({ title: `Status set to ${availabilityMeta(id).label}` });
    } catch (err: any) {
      toast({ title: "Could not update status", description: err.message, variant: "error" });
    } finally {
      setAvailBusy(null);
    }
  };

  if (!employee || !form) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <Skeleton className="h-40" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const avail = availabilityMeta(employee.availability);
  const set = (k: keyof FormState, v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Photo + status */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative shrink-0 self-start">
              {employee.photo ? (
                <img src={employee.photo} alt={employee.name} className="h-24 w-24 rounded-full object-cover ring-2 ring-zinc-200 dark:ring-zinc-700" />
              ) : (
                <Avatar name={employee.name} className="h-24 w-24 text-2xl" />
              )}
              <span className={cn("absolute bottom-1 right-1 h-4 w-4 rounded-full ring-2 ring-white dark:ring-zinc-900", avail.dot)} title={avail.label} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">{employee.name}</h2>
                <Badge className={avail.badge} variant="outline">
                  <span className={`h-1.5 w-1.5 rounded-full ${avail.dot}`} /> {avail.label}
                </Badge>
              </div>
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                {[employee.designation, employee.department].filter(Boolean).join(" · ") || "Add your designation and department below"}
                {employee.employeeCode && <> · ID {employee.employeeCode}</>}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} loading={photoBusy}>
                  {employee.photo ? <Camera className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
                  {employee.photo ? "Replace photo" : "Upload photo"}
                </Button>
                {employee.photo && (
                  <Button variant="ghost" size="sm" onClick={removePhoto} disabled={photoBusy} className="text-rose-600 hover:text-rose-700 dark:text-rose-400">
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </Button>
                )}
                <span className="text-[11px] text-zinc-400">JPG or PNG · cropped to a square</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-wrap gap-2">
          <span className="mr-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">Availability</span>
          {AVAILABILITY_OPTIONS.map((o) => (
            <Button
              key={o.id}
              size="sm"
              variant={employee.availability === o.id ? "secondary" : "ghost"}
              onClick={() => setAvailability(o.id)}
              loading={availBusy === o.id}
              className={cn(employee.availability === o.id && "ring-1 ring-zinc-300 dark:ring-zinc-600")}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", o.dot)} /> {o.label}
            </Button>
          ))}
        </CardFooter>
      </Card>

      {/* Personal information */}
      <form onSubmit={saveInfo}>
        <Card>
          <CardHeader>
            <CardTitle>Personal information</CardTitle>
            <CardDescription>Shown on the dashboard, monthly reports and exports.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </Field>
            <Field label="Nickname">
              <Input value={form.nickname ?? ""} onChange={(e) => set("nickname", e.target.value)} placeholder="What people call you" />
            </Field>
            <Field label="Date of birth">
              <Input type="date" value={form.dob ?? ""} onChange={(e) => set("dob", e.target.value)} />
            </Field>
            <Field label="Phone number">
              <Input type="tel" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="+880 1XXX-XXXXXX" />
            </Field>
            <Field label="Blood group">
              <Select value={form.bloodGroup ?? ""} onChange={(e) => set("bloodGroup", e.target.value)}>
                <option value="">Not set</option>
                {BLOOD_GROUPS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="you@company.com" />
            </Field>
            <Field label="Department">
              <Input value={form.department ?? ""} onChange={(e) => set("department", e.target.value)} placeholder="Customer Support" />
            </Field>
            <Field label="Designation">
              <Input value={form.designation ?? ""} onChange={(e) => set("designation", e.target.value)} placeholder="Support Specialist" />
            </Field>
            <Field label="Employee ID">
              <Input value={form.employeeCode ?? ""} onChange={(e) => set("employeeCode", e.target.value)} placeholder="EMP-0001" />
            </Field>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
