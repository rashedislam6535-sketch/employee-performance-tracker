import { NextResponse } from "next/server";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { resolveEmployee, loadEntries, loadAttendance, sumEntries, groupByDate } from "@/lib/data";
import { addDays, dateKey, formatDuration, isWeekend, parseDateStr, productivityScore, toDateStr, workingDaysBetween } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const rows = await db.select().from(reports).orderBy(desc(reports.createdAt));
    const list = rows
      .filter((r) => !userId || r.userId === Number(userId))
      .map((r) => ({ ...r, weekStart: dateKey(r.weekStart), weekEnd: dateKey(r.weekEnd), createdAt: new Date(r.createdAt).toISOString() }));
    return NextResponse.json({ reports: list });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

const IN_PROGRESS_BY_TYPE: Record<string, string> = {
  kyc: "Pending KYC submissions awaiting document re-upload from customers",
  support: "Open customer cases waiting on customer replies",
  hubspot: "HubSpot contact records still to be updated and tagged",
  ticket: "Tickets still marked Pending / In Progress",
  chat: "Follow-ups promised during live chats",
  call: "Scheduled callbacks for customers not reached",
  email: "Email threads awaiting customer confirmation",
  training: "Training modules not yet completed",
  meeting: "Action items from team meetings",
  other: "Miscellaneous tasks carried over from this week",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, weekStart, weekEnd } = body;
    const { user, employee } = await resolveEmployee(userId);

    const isDate = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
    const end = isDate(weekEnd) ? weekEnd : toDateStr(new Date());
    const start = isDate(weekStart) ? weekStart : toDateStr(addDays(parseDateStr(end), -6));

    const [entries, attendanceList] = await Promise.all([loadEntries(user.id, employee.id), loadAttendance(employee.id)]);
    const periodEntries = entries.filter((e) => e.date >= start && e.date <= end);
    const totals = sumEntries(periodEntries);
    const byDate = groupByDate(periodEntries);
    const daysLogged = Object.keys(byDate).length;
    const workingDays = workingDaysBetween(parseDateStr(start), parseDateStr(end));

    const dayScores = Object.entries(byDate)
      .filter(([ds]) => !isWeekend(ds))
      .map(([, list]) => productivityScore(sumEntries(list)));
    const avgScore = dayScores.length ? Math.round(dayScores.reduce((a, b) => a + b, 0) / dayScores.length) : 0;

    const periodAttendance = attendanceList.filter((a) => a.date >= start && a.date <= end && a.checkIn);
    const presentDays = new Set(periodAttendance.filter((a) => !isWeekend(a.date)).map((a) => a.date)).size;
    const workedMinutes = periodAttendance.reduce((a, r) => a + (r.status === "checked_out" ? r.workingMinutes : 0), 0);

    const typeCounts: Record<string, number> = {};
    for (const e of periodEntries) typeCounts[e.type] = (typeCounts[e.type] || 0) + 1;
    const topTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([t]) => t);

    const openTickets = periodEntries.filter((e) => e.type === "ticket" && e.status && e.status !== "Resolved").length;
    const kycCountries = Array.from(new Set(periodEntries.filter((e) => e.type === "kyc" && e.country).map((e) => e.country as string)));

    const achievements: string[] = [];
    if (totals.kyc > 0) achievements.push(`Completed ${totals.kyc} KYC verifications${kycCountries.length ? ` (${kycCountries.join(", ")})` : ""}`);
    if (totals.chats > 0) achievements.push(`Assisted ${totals.chats} customers over live chat`);
    if (totals.tickets > 0) achievements.push(`Handled ${totals.tickets} support tickets${openTickets ? ` (${openTickets} still open)` : ""}`);
    if (totals.calls > 0) achievements.push(`Handled ${totals.calls} customer phone calls`);
    if (totals.emails > 0) achievements.push(`Answered ${totals.emails} customer emails`);
    if (totals.trainingHours > 0) achievements.push(`Completed ${totals.trainingHours.toFixed(1)} hours of training`);
    if (presentDays > 0) achievements.push(`Present ${presentDays} of ${workingDays} working days${workedMinutes ? `, ${formatDuration(workedMinutes)} worked` : ""}`);
    if (achievements.length === 0) achievements.push("No work updates were logged for this period");

    const inProgress = (topTypes.length ? topTypes : ["other"]).slice(0, 4).map((t) => IN_PROGRESS_BY_TYPE[t] || IN_PROGRESS_BY_TYPE.other);

    const perDay = (v: number) => (daysLogged ? Math.max(1, Math.round(v / daysLogged)) : 0);
    const plan: string[] = [];
    if (totals.kyc > 0) plan.push(`Keep KYC verifications at ${perDay(totals.kyc)}+ per day with no backlog`);
    if (totals.tickets > 0) plan.push(`Close ${perDay(totals.tickets)}+ tickets per day within SLA${openTickets ? ` and resolve the ${openTickets} open ticket${openTickets === 1 ? "" : "s"}` : ""}`);
    if (totals.chats > 0) plan.push(`Maintain ${perDay(totals.chats)}+ chat resolutions per day`);
    if (totals.calls > 0) plan.push(`Complete all scheduled callbacks (${perDay(totals.calls)}+ calls per day)`);
    if (totals.trainingHours === 0) plan.push("Schedule at least 1 hour of training");
    plan.push("Log a work update every working day");

    const focus = topTypes.length ? topTypes.slice(0, 3).map((t) => periodEntries.find((e) => e.type === t)?.label ?? t).join(", ") : "no recorded task types";
    const content = `${employee.name} logged ${periodEntries.length} update${periodEntries.length === 1 ? "" : "s"} across ${daysLogged} day${daysLogged === 1 ? "" : "s"} between ${start} and ${end} (${workingDays} working days). Main areas of work: ${focus}. Average daily productivity score: ${avgScore}%.`;

    const metricsSnapshot = JSON.stringify({
      totalTickets: totals.tickets,
      totalChats: totals.chats,
      totalKyc: totals.kyc,
      totalCalls: totals.calls,
      totalEmails: totals.emails,
      trainingHours: Number(totals.trainingHours.toFixed(1)),
      updatesLogged: periodEntries.length,
      daysLogged,
      workingDays,
      presentDays,
      workedMinutes,
      averageScore: avgScore,
    });

    const [newReport] = await db
      .insert(reports)
      .values({
        userId: user.id,
        weekStart: start,
        weekEnd: end,
        title: `Weekly report · ${start} to ${end}`,
        content,
        keyAchievements: achievements.map((a) => `✓ ${a}`).join("\n"),
        tasksInProgress: inProgress.map((p) => `• ${p}`).join("\n"),
        nextWeekPlan: plan.map((p) => `• ${p}`).join("\n"),
        metricsSnapshot,
      })
      .returning();

    return NextResponse.json({
      success: true,
      report: { ...newReport, weekStart: dateKey(newReport.weekStart), weekEnd: dateKey(newReport.weekEnd), createdAt: new Date(newReport.createdAt).toISOString() },
    });
  } catch (error: any) {
    console.error("Report POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, keyAchievements, tasksInProgress, nextWeekPlan, content } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const [updated] = await db
      .update(reports)
      .set({
        ...(keyAchievements !== undefined ? { keyAchievements } : {}),
        ...(tasksInProgress !== undefined ? { tasksInProgress } : {}),
        ...(nextWeekPlan !== undefined ? { nextWeekPlan } : {}),
        ...(content !== undefined ? { content } : {}),
      })
      .where(eq(reports.id, Number(id)))
      .returning();
    return NextResponse.json({ success: true, report: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await db.delete(reports).where(eq(reports.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
