import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, employees } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getMemoryStore } from "@/lib/dataStore";
import { toProfile } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Please enter your email and password." }, { status: 400 });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    // --- Memory Store ---
    const store = getMemoryStore();
    const memUser = store.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (memUser) {
      const expectedPass = store.passwords[cleanEmail];

      // Strict password check — no backdoor bypasses
      if (!expectedPass || expectedPass !== cleanPassword) {
        return NextResponse.json({ error: "Incorrect password. Please try again." }, { status: 401 });
      }

      // Admin portal access check
      if (role === "admin" && memUser.role !== "admin" && memUser.role !== "manager") {
        return NextResponse.json(
          { error: "Access Denied: Your account does not have Admin clearance. Contact your administrator." },
          { status: 403 }
        );
      }

      const memEmp = store.employees.find((e) => e.userId === memUser.id) || {
        id: memUser.id,
        userId: memUser.id,
        name: memUser.name,
        nickname: memUser.name.split(" ")[0],
        photo: memUser.avatar || null,
        dob: null,
        phone: null,
        bloodGroup: null,
        email: memUser.email,
        department: memUser.department,
        designation: memUser.role === "admin" ? "System Administrator" : "Operations Specialist",
        employeeCode: `EMP-${1000 + memUser.id}`,
        availability: "available",
      };

      const token = `wp_tok_${memUser.id}_${Date.now()}`;
      return NextResponse.json({
        success: true,
        user: memUser,
        employee: memEmp,
        token,
      });
    }

    // --- Postgres DB fallback ---
    try {
      if (process.env.DATABASE_URL) {
        const dbUsers = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
        const dbUser = dbUsers[0];

        if (dbUser) {
          if (dbUser.password && dbUser.password !== cleanPassword) {
            return NextResponse.json({ error: "Incorrect password. Please try again." }, { status: 401 });
          }

          if (role === "admin" && dbUser.role !== "admin" && dbUser.role !== "manager") {
            return NextResponse.json(
              { error: "Access Denied: Admin clearance is required to enter the Admin Sector." },
              { status: 403 }
            );
          }

          const dbEmp = (
            await db.select().from(employees).where(eq(employees.userId, dbUser.id)).limit(1)
          )[0];

          const empProfile = dbEmp
            ? toProfile(dbEmp)
            : {
                id: dbUser.id,
                userId: dbUser.id,
                name: dbUser.name,
                nickname: dbUser.name.split(" ")[0],
                photo: dbUser.avatar || null,
                dob: null,
                phone: null,
                bloodGroup: null,
                email: dbUser.email,
                department: dbUser.department,
                designation: dbUser.role === "admin" ? "Administrator" : "Employee",
                employeeCode: `EMP-${1000 + dbUser.id}`,
                availability: "available",
              };

          return NextResponse.json({
            success: true,
            user: {
              id: dbUser.id,
              name: dbUser.name,
              email: dbUser.email,
              role: dbUser.role as "employee" | "admin" | "manager",
              department: dbUser.department,
              avatar: dbUser.avatar,
            },
            employee: empProfile,
            token: `wp_tok_${dbUser.id}_${Date.now()}`,
          });
        }
      }
    } catch (dbErr) {
      console.warn("DB login attempt bypassed:", dbErr);
    }

    return NextResponse.json(
      { error: "No account found with this email address. Please register first." },
      { status: 404 }
    );
  } catch (err: any) {
    console.error("Login route error:", err);
    return NextResponse.json({ error: err.message || "Login failed" }, { status: 500 });
  }
}
