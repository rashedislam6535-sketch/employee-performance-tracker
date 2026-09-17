import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, dailyUpdates, attendanceCheckIns } from "@/db/schema";
import { calculateProductivityScore } from "@/lib/utils";
import { getMemoryStore } from "@/lib/dataStore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (process.env.DATABASE_URL) {
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

        if (employeesData.length > 0) {
          return NextResponse.json({ employees: employeesData });
        }
      } catch (e) {}
    }

    const store = getMemoryStore();
    const todayStr = new Date().toISOString().split("T")[0];

    const employeesData = store.users.map((user) => {
      const emp = store.employees.find((e) => e.userId === user.id);
      const acts = store.activities.filter((a) => a.employeeId === (emp?.id || user.id));
      const todayActs = acts.filter((a) => a.date === todayStr);

      let totalTickets = 0;
      let totalChats = 0;
      let totalKyc = 0;
      let totalCalls = 0;
      let totalEmails = 0;
      let totalTraining = 0;

      for (const a of acts) {
        if (a.type === "ticket") totalTickets += a.quantity || 1;
        if (a.type === "chat") totalChats += a.quantity || 1;
        if (a.type === "kyc") totalKyc += a.quantity || 1;
        if (a.type === "call") totalCalls += a.quantity || 1;
        if (a.type === "email") totalEmails += a.quantity || 1;
        if (a.type === "training") totalTraining += a.quantity || 1;
      }

      const att = store.attendance.find((a) => a.date === todayStr);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        avatar: emp?.photo || user.avatar,
        employee: emp || null,
        stats: {
          tickets: totalTickets,
          chats: totalChats,
          kyc: totalKyc,
          calls: totalCalls,
          emails: totalEmails,
          trainingHours: Number(totalTraining.toFixed(1)),
          entriesCount: acts.length,
          performanceScore: Math.min(99, Math.max(78, 80 + (acts.length * 3))),
          todayLogged: todayActs.length > 0,
          attendanceStatus: att ? att.status : (user.role === "admin" ? "working" : "not_checked_in"),
          checkInTime: att?.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null,
        },
      };
    });

    return NextResponse.json({ employees: employeesData });
  } catch (error: any) {
    console.error("Employees API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
