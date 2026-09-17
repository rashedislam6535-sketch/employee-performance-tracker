"use client";

import type { AttendanceRecord, Entry, EmployeeProfile } from "@/types";
import { CategoryScore, formatDate, formatDuration, formatTime, num } from "@/lib/utils";

export interface MonthlyExportData {
  employee: EmployeeProfile;
  monthLabel: string;
  monthKey: string; // YYYY-MM
  workingDaysTotal: number;
  workingDaysElapsed: number;
  attendanceDays: number;
  attendancePct: number;
  workedMinutes: number;
  avgScore: number;
  scores: CategoryScore[]; // monthly (target × working days elapsed)
  entries: Entry[];
  attendance: AttendanceRecord[];
}

function entryDetail(e: Entry): string {
  const parts: string[] = [];
  if (e.country) parts.push(`Country: ${e.country}`);
  if (e.accountId) parts.push(`MT ID: ${e.accountId}`);
  if (e.ticketCategory) parts.push(e.ticketCategory);
  if (e.priority) parts.push(`Priority: ${e.priority}`);
  if (e.status) parts.push(`Status: ${e.status}`);
  return parts.join(" · ");
}

function summaryRows(d: MonthlyExportData): (string | number)[][] {
  return [
    ["Employee", d.employee.name],
    ["Employee ID", d.employee.employeeCode ?? ""],
    ["Department", d.employee.department ?? ""],
    ["Designation", d.employee.designation ?? ""],
    ["Month", d.monthLabel],
    ["Working days (Mon–Fri)", `${d.workingDaysElapsed} of ${d.workingDaysTotal}`],
    ["Attendance", `${d.attendanceDays} days (${d.attendancePct}%)`],
    ["Hours worked", formatDuration(d.workedMinutes)],
    ["Average productivity score", `${d.avgScore}%`],
  ];
}

export async function exportMonthlyXlsx(d: MonthlyExportData) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  const summary = XLSX.utils.aoa_to_sheet([
    ["Monthly Performance Report"],
    [],
    ...summaryRows(d),
    [],
    ["Task summary", "Completed", "Monthly target", "Achievement"],
    ...d.scores.map((s) => [s.label, s.completed, s.target, `${s.rawPct}%`]),
  ]);
  summary["!cols"] = [{ wch: 28 }, { wch: 24 }, { wch: 16 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, summary, "Summary");

  const acts = XLSX.utils.json_to_sheet(
    d.entries.map((e) => ({
      Date: e.date,
      Activity: e.label,
      Description: e.description,
      Details: entryDetail(e),
      Tickets: e.tickets,
      Chats: e.chats,
      KYC: e.kyc,
      Calls: e.calls,
      Emails: e.emails,
      "Training (h)": e.trainingHours,
    }))
  );
  acts["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 50 }, { wch: 40 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, acts, "Activities");

  const att = XLSX.utils.json_to_sheet(
    d.attendance.map((a) => ({
      Date: a.date,
      "Check in": formatTime(a.checkIn),
      "Check out": formatTime(a.checkOut),
      "Breaks (min)": a.breakMinutes,
      "Working time": a.status === "checked_out" ? formatDuration(a.workingMinutes) : a.checkIn ? "In progress" : "",
      Location: a.location ?? "",
      Device: a.device ?? "",
    }))
  );
  att["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, att, "Attendance");

  XLSX.writeFile(wb, `performance-${d.monthKey}-${slug(d.employee.name)}.xlsx`);
}

export async function exportMonthlyPdf(d: MonthlyExportData) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Monthly Performance Report", 40, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`${d.employee.name}${d.employee.department ? ` · ${d.employee.department}` : ""} · ${d.monthLabel}`, 40, 66);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 84,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 170 } },
    body: summaryRows(d).map((r) => r.map(String)),
  });

  const afterSummary = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Task summary", 40, afterSummary);
  autoTable(doc, {
    startY: afterSummary + 8,
    head: [["Category", "Completed", "Monthly target", "Achievement"]],
    body: d.scores.map((s) => [s.label, String(s.completed), String(s.target), `${s.rawPct}%`]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [79, 70, 229] },
  });

  const afterTasks = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  doc.text("Attendance", 40, afterTasks);
  autoTable(doc, {
    startY: afterTasks + 8,
    head: [["Date", "Check in", "Check out", "Breaks", "Working time", "Location"]],
    body: d.attendance.map((a) => [a.date, formatTime(a.checkIn), formatTime(a.checkOut), formatDuration(a.breakMinutes), a.status === "checked_out" ? formatDuration(a.workingMinutes) : a.checkIn ? "In progress" : "—", a.location ?? ""]),
    styles: { fontSize: 8.5 },
    headStyles: { fillColor: [63, 63, 70] },
  });

  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Activity log", 40, 48);
  autoTable(doc, {
    startY: 56,
    head: [["Date", "Activity", "Description / details", "Tkt", "Chat", "KYC", "Call", "Mail", "Trn h"]],
    body: d.entries.map((e) => [e.date, e.label, [e.description, entryDetail(e)].filter(Boolean).join("\n"), z(e.tickets), z(e.chats), z(e.kyc), z(e.calls), z(e.emails), z(e.trainingHours)]),
    styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
    columnStyles: { 2: { cellWidth: 200 } },
    headStyles: { fillColor: [63, 63, 70] },
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`WorkPulse · generated ${new Date().toLocaleDateString()} · page ${i} of ${pages}`, W - 40, doc.internal.pageSize.getHeight() - 24, { align: "right" });
  }
  doc.save(`performance-${d.monthKey}-${slug(d.employee.name)}.pdf`);
}

export async function exportWeeklyReportPdf(r: {
  employeeName: string;
  department: string;
  weekStart: string;
  weekEnd: string;
  content: string;
  keyAchievements: string;
  tasksInProgress: string;
  nextWeekPlan: string;
  snapshot: Record<string, unknown> | null;
}) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 48;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Weekly Report", margin, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`${r.employeeName}${r.department ? ` · ${r.department}` : ""} · ${formatDate(r.weekStart)} – ${formatDate(r.weekEnd)}`, margin, y);
  doc.setTextColor(0);
  y += 20;

  if (r.snapshot) {
    autoTable(doc, {
      startY: y,
      head: [["Tickets", "Chats", "KYC", "Calls", "Emails", "Training", "Days present", "Avg score"]],
      body: [[
        String(num(r.snapshot.totalTickets)),
        String(num(r.snapshot.totalChats)),
        String(num(r.snapshot.totalKyc)),
        String(num(r.snapshot.totalCalls)),
        String(num(r.snapshot.totalEmails)),
        `${num(r.snapshot.trainingHours)}h`,
        r.snapshot.presentDays !== undefined ? `${num(r.snapshot.presentDays)} / ${num(r.snapshot.workingDays)}` : "—",
        `${num(r.snapshot.averageScore)}%`,
      ]],
      styles: { fontSize: 9, halign: "center" },
      headStyles: { fillColor: [79, 70, 229] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  }

  const section = (title: string, text: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(text || "—", W - margin * 2);
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage();
        y = 48;
      }
      doc.text(line, margin, y);
      y += 14;
    }
    y += 10;
  };

  section("Summary", r.content);
  section("Key Achievements", r.keyAchievements);
  section("Tasks In Progress", r.tasksInProgress);
  section("Next Week Plan", r.nextWeekPlan);
  doc.save(`weekly-report-${r.weekStart}.pdf`);
}

const z = (n: number) => (n ? String(n) : "");
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
