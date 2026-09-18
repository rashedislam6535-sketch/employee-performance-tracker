import { NextResponse } from "next/server";
import { getMemoryStore, saveToDisk } from "@/lib/dataStore";
import type { User, EmployeeProfile } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const store = getMemoryStore();
    const todayStr = new Date().toISOString().split("T")[0];

    const usersWithProfiles = store.users.map((u) => {
      const emp = store.employees.find((e) => e.userId === u.id);
      const userActs = store.activities.filter((a) => a.employeeId === (emp?.id || u.id));
      const todayActs = userActs.filter((a) => a.date === todayStr);
      const att = store.attendance.find(
        (a) => (a.employeeId === (emp?.id || u.id) || a.userId === u.id) && a.date === todayStr
      );

      const totalTasks = userActs.reduce((acc, curr) => acc + (curr.quantity || 1), 0);

      return {
        ...u,
        employee: emp || null,
        stats: {
          totalActivities: userActs.length,
          totalTasks,
          todayActivities: todayActs.length,
          availability: emp?.availability || "available",
          attendanceStatus: att?.status || "not_checked_in",
          lastActive: userActs[0]?.createdAt || "Recent",
        },
      };
    });

    return NextResponse.json({
      success: true,
      users: usersWithProfiles,
      totalCount: store.users.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, role, department, designation, availability } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const store = getMemoryStore();
    const userIndex = store.users.findIndex((u) => u.id === Number(userId));
    if (userIndex === -1) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (role) store.users[userIndex].role = role;
    if (department) store.users[userIndex].department = department;

    const empIndex = store.employees.findIndex((e) => e.userId === Number(userId));
    if (empIndex !== -1) {
      if (department) store.employees[empIndex].department = department;
      if (designation) store.employees[empIndex].designation = designation;
      if (availability) store.employees[empIndex].availability = availability;
    }
    saveToDisk(store);

    return NextResponse.json({
      success: true,
      user: store.users[userIndex],
      employee: store.employees[empIndex],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = Number(searchParams.get("userId"));

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const store = getMemoryStore();
    const targetUser = store.users.find((u) => u.id === userId);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    // Prevent deleting the last admin
    if (targetUser.role === "admin") {
      const adminCount = store.users.filter((u) => u.role === "admin").length;
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Cannot remove the last administrator account." }, { status: 400 });
      }
    }

    store.users = store.users.filter((u) => u.id !== userId);
    store.employees = store.employees.filter((e) => e.userId !== userId);
    store.activities = store.activities.filter((a) => a.employeeId !== userId);
    saveToDisk(store);

    return NextResponse.json({ success: true, message: "User removed successfully." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
