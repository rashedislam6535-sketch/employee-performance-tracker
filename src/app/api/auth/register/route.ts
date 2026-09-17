import { NextResponse } from "next/server";
import { getMemoryStore, resolveNewUserRole } from "@/lib/dataStore";
import type { User, EmployeeProfile } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { name, email, password, department, designation, employeeCode } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }

    if (String(password).trim().length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();
    const cleanDept = String(department || "Customer Support").trim();

    const store = getMemoryStore();
    const exists = store.users.some((u) => u.email.toLowerCase() === cleanEmail);
    if (exists) {
      return NextResponse.json({ error: "An account with this email address already exists." }, { status: 409 });
    }

    // Role is always resolved server-side — users cannot self-assign admin.
    // First registrant → admin, everyone else → employee.
    const resolvedRole = resolveNewUserRole(store);

    const cleanDesig = String(
      designation || (resolvedRole === "admin" ? "System Administrator" : "Support Specialist")
    ).trim();

    const newId = (store.users.length > 0 ? Math.max(...store.users.map((u) => u.id)) : 0) + 1;

    const newUser: User = {
      id: newId,
      name: cleanName,
      email: cleanEmail,
      role: resolvedRole,
      department: cleanDept,
      avatar: null,
    };

    const newEmployee: EmployeeProfile = {
      id: newId,
      userId: newId,
      name: cleanName,
      nickname: cleanName.split(" ")[0],
      photo: null,
      dob: null,
      phone: null,
      bloodGroup: null,
      email: cleanEmail,
      department: cleanDept,
      designation: cleanDesig,
      employeeCode: employeeCode ? String(employeeCode).trim() : `EMP-${1000 + newId}`,
      availability: "available",
    };

    store.users.push(newUser);
    store.employees.push(newEmployee);
    store.passwords[cleanEmail] = String(password).trim();

    // Welcome notification
    store.notifications.push({
      id: store.notifications.length + 1,
      userId: newId,
      title: resolvedRole === "admin" ? "Welcome, Administrator!" : "Welcome to WorkPulse!",
      message:
        resolvedRole === "admin"
          ? "You are the first user and have been granted full Admin access. Use the Admin Hub to manage your team and grant permissions."
          : "Your profile has been created. You can now check in, log your daily performance, and manage your tasks.",
      type: "system",
      isRead: 0,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      user: newUser,
      employee: newEmployee,
      token: `wp_tok_${newId}_${Date.now()}`,
    });
  } catch (err: any) {
    console.error("Register error:", err);
    return NextResponse.json({ error: err.message || "Registration failed" }, { status: 500 });
  }
}
