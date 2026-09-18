import { NextResponse } from "next/server";
import { getMemoryStore, resolveNewUserRole, saveToDisk } from "@/lib/dataStore";
import type { User, EmployeeProfile } from "@/types";
import { db } from "@/db";
import { users, employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { toProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { name, email, password, department, designation, employeeCode, role } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }

    if (String(password).trim().length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();
    const cleanDept = String(department || "Customer Support").trim();
    const allowedRoles = ["admin", "employee", "manager"];

    const store = getMemoryStore();

    if (process.env.DATABASE_URL) {
      try {
        const existingUsers = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
        if (existingUsers.length > 0) {
          return NextResponse.json({ error: "An account with this email address already exists." }, { status: 409 });
        }

        const totalUsers = await db.select().from(users);
        const resolvedRole: "admin" | "employee" | "manager" =
          role && allowedRoles.includes(role)
            ? (role as "admin" | "employee" | "manager")
            : totalUsers.length === 0
            ? "admin"
            : "employee";

        const cleanDesig = String(
          designation ||
            (resolvedRole === "admin"
              ? "System Administrator"
              : resolvedRole === "manager"
              ? "Operations Manager"
              : "Support Specialist")
        ).trim();

        const [insertedUser] = await db
          .insert(users)
          .values({
            name: cleanName,
            email: cleanEmail,
            password: String(password).trim(),
            role: resolvedRole,
            department: cleanDept,
            avatar: null,
          })
          .returning();

        const [insertedEmp] = await db
          .insert(employees)
          .values({
            userId: insertedUser.id,
            name: cleanName,
            nickname: cleanName.split(" ")[0],
            photo: null,
            email: cleanEmail,
            department: cleanDept,
            designation: cleanDesig,
            employeeCode: employeeCode ? String(employeeCode).trim() : `EMP-${1000 + insertedUser.id}`,
            availability: "available",
          })
          .returning();

        const newUser: User = {
          id: insertedUser.id,
          name: insertedUser.name,
          email: insertedUser.email,
          role: insertedUser.role as "employee" | "admin" | "manager",
          department: insertedUser.department,
          avatar: insertedUser.avatar,
        };

        const newEmployee = toProfile(insertedEmp);

        store.users.push(newUser);
        store.employees.push(newEmployee);
        store.passwords[cleanEmail] = String(password).trim();
        saveToDisk(store);

        return NextResponse.json({
          success: true,
          user: newUser,
          employee: newEmployee,
          token: `wp_tok_${newUser.id}_${Date.now()}`,
        });
      } catch (dbErr) {
        console.warn("Registration DB write bypassed, utilizing active data store.");
      }
    }

    // Memory Store Path
    const exists = store.users.some((u) => u.email.toLowerCase() === cleanEmail);
    if (exists) {
      return NextResponse.json({ error: "An account with this email address already exists." }, { status: 409 });
    }

    const resolvedRole: "admin" | "employee" | "manager" =
      role && allowedRoles.includes(role)
        ? (role as "admin" | "employee" | "manager")
        : resolveNewUserRole(store);

    const cleanDesig = String(
      designation ||
        (resolvedRole === "admin"
          ? "System Administrator"
          : resolvedRole === "manager"
          ? "Operations Manager"
          : "Support Specialist")
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
    saveToDisk(store);

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
