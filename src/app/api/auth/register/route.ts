import { NextResponse } from "next/server";
import { getMemoryStore } from "@/lib/dataStore";
import type { User, EmployeeProfile } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { name, email, password, role, department, designation, employeeCode } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();
    const cleanRole = (role === "admin" || role === "manager") ? role : "employee";
    const cleanDept = String(department || "Customer Support").trim();
    const cleanDesig = String(designation || (cleanRole === "admin" ? "System Administrator" : "Support Specialist")).trim();

    const store = getMemoryStore();
    const exists = store.users.some((u) => u.email.toLowerCase() === cleanEmail);
    if (exists) {
      return NextResponse.json({ error: "An account with this email address already exists." }, { status: 409 });
    }

    const newId = store.users.length + 1;
    const newUser: User = {
      id: newId,
      name: cleanName,
      email: cleanEmail,
      role: cleanRole,
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

    // Add welcome notification
    store.notifications.push({
      id: store.notifications.length + 1,
      userId: newId,
      title: "Welcome to WorkPulse!",
      message: "Your profile has been created successfully. You can now check in, log your daily performance, and manage your tasks.",
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
