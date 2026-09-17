import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { resolveEmployee, loadEntries, loadAttendance, sumEntries, groupByDate } from "@/lib/data";
import {
  addDays,
  isWeekend,
  parseDateStr,
  previousWorkingDay,
  productivityScore,
  startOfWeek,
  tasksCompleted,
  toDateStr,
  weekdayLong,
  weekdayShort,
  workingDaysInMonth,
} from "@/lib/utils";
import type { DashboardData, DayPoint } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const todayParam = searchParams.get("today");
    const todayStr = todayParam && /^\d{4}-\d{2}-\d{2}$/.test(todayParam) ? todayParam : toDateStr(new Date());
    const today = parseDateStr(todayStr);

    const { user, employee } = await resolveEmployee(searchParams.get("userId"));
    const [entries, attendanceList] = await Promise.all([loadEntries(user.id, employee.id), loadAttendance(employee.id)]);
    const byDate = groupByDate(entries);

    // Today & previous working day
    const todayList = byDate[todayStr] || [];
    const todayTotals = sumEntries(todayList);
    const prevDate = previousWorkingDay(todayStr);
    const yesterdayStr = toDateStr(addDays(today, -1));
    const prevList = byDate[prevDate] || [];
    const prevTotals = sumEntries(prevList);

    // Last 14 days series
    const series: DayPoint[] = [];
    for (let i = 13; i >= 0; i--) {
      const ds = toDateStr(addDays(today, -i));
      const list = byDate[ds] || [];
      const t = sumEntries(list);
      series.push({ date: ds, ...t, total: tasksCompleted(t), score: list.length ? productivityScore(t) : 0, hasData: list.length > 0, weekend: isWeekend(ds) });
    }
    const weekTotals = {
      thisWeek: series.slice(7).reduce((a, p) => a + p.total, 0),
      lastWeek: series.slice(0, 7).reduce((a, p) => a + p.total, 0),
    };

    // Current week Monday–Friday
    const monday = startOfWeek(today);
    const week = Array.from({ length: 5 }, (_, i) => {
      const ds = toDateStr(addDays(monday, i));
      const t = sumEntries(byDate[ds] || []);
      return { date: ds, label: weekdayShort(ds), tickets: t.tickets, chats: t.chats, kyc: t.kyc, calls: t.calls, emails: t.emails };
    });

    // Month to date (working days only for expectations; totals include everything logged)
    const monthPrefix = todayStr.slice(0, 7);
    const monthEntries = entries.filter((e) => e.date.startsWith(monthPrefix));
    const monthTotals = sumEntries(monthEntries);
    const monthByDate = groupByDate(monthEntries);
    const wd = workingDaysInMonth(today.getFullYear(), today.getMonth(), today);
    const monthAttendance = attendanceList.filter((a) => a.date.startsWith(monthPrefix) && a.checkIn && !isWeekend(a.date));
    const attendanceDays = new Set(monthAttendance.map((a) => a.date)).size;
    const workingMinutes = attendanceList
      .filter((a) => a.date.startsWith(monthPrefix) && a.checkIn)
      .reduce((a, r) => a + (r.status === "checked_out" ? r.workingMinutes : 0), 0);
    const dayScores = Object.entries(monthByDate)
      .filter(([ds]) => !isWeekend(ds))
      .map(([, list]) => productivityScore(sumEntries(list)));
    const avgScore = dayScores.length ? Math.round(dayScores.reduce((a, b) => a + b, 0) / dayScores.length) : 0;

    // Task distribution, last 30 days
    const cutoff = toDateStr(addDays(today, -29));
    const dist: Record<string, number> = {};
    for (const e of entries) if (e.date >= cutoff) dist[e.label] = (dist[e.label] || 0) + 1;
    const taskDistribution = Object.entries(dist)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    // Streak of consecutive working days with entries (weekends are skipped, not broken)
    let streak = 0;
    let cursor = todayList.length ? today : addDays(today, -1);
    for (let guard = 0; guard < 400; guard++) {
      const ds = toDateStr(cursor);
      const dow = cursor.getDay();
      if (byDate[ds]) {
        streak++;
        cursor = addDays(cursor, -1);
        continue;
      }
      if (dow === 0 || dow === 6) {
        cursor = addDays(cursor, -1);
        continue;
      }
      break;
    }

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(15);

    const todayAttendance = attendanceList.find((a) => a.date === todayStr) ?? null;

    const payload: DashboardData = {
      user,
      employee,
      todayDate: todayStr,
      isWeekend: isWeekend(todayStr),
      today: { ...todayTotals, hasData: todayList.length > 0, tasksCompleted: tasksCompleted(todayTotals), score: productivityScore(todayTotals) },
      previous: {
        ...prevTotals,
        date: prevDate,
        label: prevDate === yesterdayStr ? "Yesterday" : weekdayLong(prevDate),
        hasData: prevList.length > 0,
      },
      series,
      week,
      weekTotals,
      month: {
        ...monthTotals,
        label: today.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        daysLogged: Object.keys(monthByDate).filter((ds) => !isWeekend(ds)).length,
        workingDaysTotal: wd.total,
        workingDaysElapsed: wd.elapsed,
        attendanceDays,
        attendancePct: wd.elapsed ? Math.min(100, Math.round((attendanceDays / wd.elapsed) * 100)) : 0,
        workingMinutes,
        avgScore,
      },
      taskDistribution,
      streak,
      recentEntries: entries.slice(0, 8),
      attendance: todayAttendance,
      notifications: userNotifications.map((n) => ({ ...n, createdAt: new Date(n.createdAt).toISOString() })),
    };

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
