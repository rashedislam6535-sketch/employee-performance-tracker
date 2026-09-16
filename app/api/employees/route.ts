import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, dailyUpdates, attendanceCheckIns } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { calculateProductivityScore } from "@/lib/utils";

export async function GET() {
  try {
    const allUsers = await db.select().from(users).orderBy(users.role);
    const allUpdates = await db.select().from(dailyUpdates);
    const allAttendances = await db.select().from(attendanceCheckIns);

    const todayStr = new Date().toISOString().split("T")[0];

    const employeesData = allUsers.map((user) => {
      const userUpdates = allUpdates.filter((u) => u.userId === user.id);
      const todayUpdate = userUpdates.filter((u) => u.date === todayStr);

      let totalTickets = 0;
      let totalChats = 0;
      let totalKyc = 0;
      let totalCalls = 0;
      let totalEmails = 0;
      let totalTraining = 0;

      for (const u of userUpdates) {
        totalTickets += u.tickets;
        totalChats += u.chats;
        totalKyc += u.kyc;
        totalCalls += u.calls;
        totalEmails += u.emails;
        totalTraining += parseFloat(u.trainingHours || "0");
      }

      // Calculate score based on updates count and performance
      const avgScore = userUpdates.length > 0
        ? Math.round(
            userUpdates.reduce((acc, curr) => acc + calculateProductivityScore(curr), 0) /
              userUpdates.length
          )
        : 75;

      const userAttendance = allAttendances.find((a) => a.userId === user.id && a.date === todayStr);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        avatar: user.avatar,
        stats: {
          tickets: totalTickets,
          chats: totalChats,
          kyc: totalKyc,
          calls: totalCalls,
          emails: totalEmails,
          trainingHours: Number(totalTraining.toFixed(1)),
          entriesCount: userUpdates.length,
          performanceScore: Math.min(99, Math.max(65, avgScore)),
          todayLogged: todayUpdate.length > 0,
          attendanceStatus: userAttendance ? userAttendance.status : "not_checked_in",
          checkInTime: userAttendance?.checkInTime || null,
        },
      };
    });

    return NextResponse.json({ employees: employeesData });
  } catch (error: any) {
    console.error("Employees API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
