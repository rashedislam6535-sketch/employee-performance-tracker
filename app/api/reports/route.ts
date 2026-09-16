import { NextResponse } from "next/server";
import { db } from "@/db";
import { reports, dailyUpdates, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { addDays, calculateProductivityScore, parseDateStr, toDateStr } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const rows = await db
      .select({
        id: reports.id,
        userId: reports.userId,
        userName: users.name,
        department: users.department,
        weekStart: reports.weekStart,
        weekEnd: reports.weekEnd,
        title: reports.title,
        content: reports.content,
        keyAchievements: reports.keyAchievements,
        tasksInProgress: reports.tasksInProgress,
        nextWeekPlan: reports.nextWeekPlan,
        metricsSnapshot: reports.metricsSnapshot,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .leftJoin(users, eq(reports.userId, users.id))
      .orderBy(desc(reports.createdAt));

    if (userId) {
      const uId = Number(userId);
      return NextResponse.json({ reports: rows.filter((r) => r.userId === uId) });
    }
    return NextResponse.json({ reports: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

const IN_PROGRESS_BY_TYPE: Record<string, string> = {
  "KYC Verification": "Pending KYC submissions awaiting document re-upload from customers",
  "Customer Support": "Open customer cases waiting on customer replies",
  HubSpot: "HubSpot contact records still to be updated and tagged",
  "Ticket Handling": "Escalated tickets awaiting resolution from other teams",
  "Chat Support": "Follow-ups promised during live chats",
  "Phone Call": "Scheduled callbacks for customers not reached",
  Email: "Email threads awaiting customer confirmation",
  Training: "Training modules not yet completed",
  Meeting: "Action items from team meetings",
  Other: "Miscellaneous tasks carried over from this week",
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, weekStart, weekEnd } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const targetUser = (await db.select().from(users).where(eq(users.id, Number(userId))))[0];
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isDate = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
    const end = isDate(weekEnd) ? weekEnd : toDateStr(new Date());
    const start = isDate(weekStart) ? weekStart : toDateStr(addDays(parseDateStr(end), -6));

    const userUpdates = await db.select().from(dailyUpdates).where(eq(dailyUpdates.userId, targetUser.id));
    const weekUpdates = userUpdates.filter((u) => u.date >= start && u.date <= end);

    let tickets = 0,
      chats = 0,
      kyc = 0,
      calls = 0,
      emails = 0,
      trainingHours = 0;
    const typeCounts: Record<string, number> = {};
    const byDate: Record<string, typeof weekUpdates> = {};

    for (const u of weekUpdates) {
      tickets += u.tickets;
      chats += u.chats;
      kyc += u.kyc;
      calls += u.calls;
      emails += u.emails;
      trainingHours += parseFloat(u.trainingHours || "0");
      typeCounts[u.taskType] = (typeCounts[u.taskType] || 0) + 1;
      (byDate[u.date] ||= []).push(u);
    }

    const daysLogged = Object.keys(byDate).length;
    const dailyScores = Object.values(byDate).map((list) =>
      calculateProductivityScore({
        tickets: list.reduce((a, b) => a + b.tickets, 0),
        chats: list.reduce((a, b) => a + b.chats, 0),
        kyc: list.reduce((a, b) => a + b.kyc, 0),
        calls: list.reduce((a, b) => a + b.calls, 0),
        emails: list.reduce((a, b) => a + b.emails, 0),
        trainingHours: list.reduce((a, b) => a + parseFloat(b.trainingHours || "0"), 0),
      })
    );
    const avgScore = dailyScores.length
      ? Math.round(dailyScores.reduce((a, b) => a + b, 0) / dailyScores.length)
      : 0;

    const topTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t);

    // Key achievements — only what actually happened
    const achievements: string[] = [];
    if (kyc > 0) achievements.push(`Completed ${kyc} KYC verifications`);
    if (chats > 0) achievements.push(`Assisted ${chats} customers over live chat`);
    if (tickets > 0) achievements.push(`Resolved ${tickets} support tickets`);
    if (calls > 0) achievements.push(`Handled ${calls} customer phone calls`);
    if (emails > 0) achievements.push(`Answered ${emails} customer emails`);
    if (trainingHours > 0) achievements.push(`Completed ${trainingHours.toFixed(1)} hours of training`);
    if (daysLogged > 0) achievements.push(`Logged work on ${daysLogged} day${daysLogged === 1 ? "" : "s"} this period`);
    if (achievements.length === 0) achievements.push("No work updates were logged for this period");

    const inProgress = (topTypes.length ? topTypes : ["Other"])
      .slice(0, 4)
      .map((t) => IN_PROGRESS_BY_TYPE[t] || IN_PROGRESS_BY_TYPE.Other);

    const perDay = (v: number) => (daysLogged ? Math.max(1, Math.round(v / daysLogged)) : 0);
    const plan: string[] = [];
    if (kyc > 0) plan.push(`Keep KYC verifications at ${perDay(kyc)}+ per day with no backlog`);
    if (tickets > 0) plan.push(`Close ${perDay(tickets)}+ tickets per day within SLA`);
    if (chats > 0) plan.push(`Maintain ${perDay(chats)}+ chat resolutions per day`);
    if (calls > 0) plan.push(`Complete all scheduled callbacks (${perDay(calls)}+ calls per day)`);
    if (trainingHours === 0) plan.push("Schedule at least 1 hour of training");
    plan.push("Log a work update every working day");

    const focus = topTypes.length ? topTypes.slice(0, 3).join(", ") : "no recorded task types";
    const content = `${targetUser.name} logged ${weekUpdates.length} update${weekUpdates.length === 1 ? "" : "s"} across ${daysLogged} day${daysLogged === 1 ? "" : "s"} between ${start} and ${end}. Main areas of work: ${focus}. Average daily productivity score: ${avgScore}%.`;

    const metricsSnapshot = JSON.stringify({
      totalTickets: tickets,
      totalChats: chats,
      totalKyc: kyc,
      totalCalls: calls,
      totalEmails: emails,
      trainingHours: Number(trainingHours.toFixed(1)),
      updatesLogged: weekUpdates.length,
      daysLogged,
      averageScore: avgScore,
    });

    const newReport = await db
      .insert(reports)
      .values({
        userId: targetUser.id,
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

    return NextResponse.json({ success: true, report: newReport[0] });
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

    const updated = await db
      .update(reports)
      .set({
        ...(keyAchievements !== undefined ? { keyAchievements } : {}),
        ...(tasksInProgress !== undefined ? { tasksInProgress } : {}),
        ...(nextWeekPlan !== undefined ? { nextWeekPlan } : {}),
        ...(content !== undefined ? { content } : {}),
      })
      .where(eq(reports.id, Number(id)))
      .returning();

    return NextResponse.json({ success: true, report: updated[0] });
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
