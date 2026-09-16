import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, dailyUpdates, reports, attendanceCheckIns, notifications } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { ensureSeedData } from "@/db/seed";
import { addDays, calculateProductivityScore, parseDateStr, toDateStr } from "@/lib/utils";

type Agg = {
  tickets: number;
  chats: number;
  kyc: number;
  calls: number;
  emails: number;
  trainingHours: number;
  count: number;
};

const emptyAgg = (): Agg => ({ tickets: 0, chats: 0, kyc: 0, calls: 0, emails: 0, trainingHours: 0, count: 0 });

function aggregate(list: (typeof dailyUpdates.$inferSelect)[]): Agg {
  const a = emptyAgg();
  for (const u of list) {
    a.tickets += u.tickets;
    a.chats += u.chats;
    a.kyc += u.kyc;
    a.calls += u.calls;
    a.emails += u.emails;
    a.trainingHours += parseFloat(u.trainingHours || "0");
    a.count += 1;
  }
  a.trainingHours = Number(a.trainingHours.toFixed(2));
  return a;
}

const publicUser = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  department: users.department,
  avatar: users.avatar,
  createdAt: users.createdAt,
};

export async function GET(request: Request) {
  try {
    await ensureSeedData();

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    const todayParam = searchParams.get("today");
    const todayStr =
      todayParam && /^\d{4}-\d{2}-\d{2}$/.test(todayParam) ? todayParam : toDateStr(new Date());
    const today = parseDateStr(todayStr);

    let currentUser = userIdParam
      ? (await db.select(publicUser).from(users).where(eq(users.id, Number(userIdParam))))[0]
      : undefined;
    if (!currentUser) {
      currentUser = (await db.select(publicUser).from(users).orderBy(users.id).limit(1))[0];
    }
    if (!currentUser) {
      return NextResponse.json({ error: "No user found" }, { status: 404 });
    }

    const allUpdates = await db
      .select()
      .from(dailyUpdates)
      .where(eq(dailyUpdates.userId, currentUser.id))
      .orderBy(desc(dailyUpdates.date), desc(dailyUpdates.createdAt));

    const byDate: Record<string, (typeof dailyUpdates.$inferSelect)[]> = {};
    for (const u of allUpdates) {
      (byDate[u.date] ||= []).push(u);
    }

    // Last 14 days, oldest first
    type DayPoint = Agg & { date: string; total: number; score: number; hasData: boolean };
    const series: DayPoint[] = [];
    for (let i = 13; i >= 0; i--) {
      const ds = toDateStr(addDays(today, -i));
      const list = byDate[ds] || [];
      const agg = aggregate(list);
      series.push({
        date: ds,
        ...agg,
        total: agg.tickets + agg.chats + agg.kyc + agg.calls + agg.emails,
        score: list.length ? calculateProductivityScore(agg) : 0,
        hasData: list.length > 0,
      });
    }
    const sumTotal = (arr: typeof series) => arr.reduce((acc, p) => acc + p.total, 0);
    const weekTotals = { thisWeek: sumTotal(series.slice(7)), lastWeek: sumTotal(series.slice(0, 7)) };

    const todayList = byDate[todayStr] || [];
    const yesterdayList = byDate[toDateStr(addDays(today, -1))] || [];
    const todayAgg = aggregate(todayList);
    const yesterdayAgg = aggregate(yesterdayList);

    // Calendar month to date
    const monthPrefix = todayStr.slice(0, 7);
    const monthUpdates = allUpdates.filter((u) => u.date.startsWith(monthPrefix));
    const monthAgg = aggregate(monthUpdates);
    const monthDaysLogged = new Set(monthUpdates.map((u) => u.date)).size;

    // Task distribution, last 30 days
    const cutoff = toDateStr(addDays(today, -29));
    const dist: Record<string, number> = {};
    for (const u of allUpdates) {
      if (u.date >= cutoff) dist[u.taskType] = (dist[u.taskType] || 0) + 1;
    }
    const taskDistribution = Object.entries(dist)
      .map(([taskType, count]) => ({ taskType, count }))
      .sort((a, b) => b.count - a.count);

    // Streak of consecutive logged days (weekends don't break it)
    let streak = 0;
    let cursor = todayList.length ? today : addDays(today, -1);
    for (let guard = 0; guard < 400; guard++) {
      const ds = toDateStr(cursor);
      if (byDate[ds]) {
        streak++;
        cursor = addDays(cursor, -1);
        continue;
      }
      const dow = cursor.getDay();
      if (dow === 0 || dow === 6) {
        cursor = addDays(cursor, -1);
        continue;
      }
      break;
    }

    const userReports = await db
      .select()
      .from(reports)
      .where(eq(reports.userId, currentUser.id))
      .orderBy(desc(reports.createdAt))
      .limit(5);

    const attendance = await db
      .select()
      .from(attendanceCheckIns)
      .where(and(eq(attendanceCheckIns.userId, currentUser.id), eq(attendanceCheckIns.date, todayStr)))
      .limit(1);

    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, currentUser.id))
      .orderBy(desc(notifications.createdAt))
      .limit(15);

    return NextResponse.json({
      user: currentUser,
      todayDate: todayStr,
      today: { ...todayAgg, hasData: todayList.length > 0 },
      yesterday: { ...yesterdayAgg, hasData: yesterdayList.length > 0 },
      series,
      weekTotals,
      monthTotals: { ...monthAgg, daysLogged: monthDaysLogged },
      taskDistribution,
      streak,
      recentUpdates: allUpdates.slice(0, 8),
      reports: userReports,
      attendance: attendance[0] || null,
      notifications: userNotifications,
    });
  } catch (error: any) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
