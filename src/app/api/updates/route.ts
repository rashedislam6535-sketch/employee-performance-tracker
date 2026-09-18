import { NextResponse } from "next/server";
import { db } from "@/db";
import { dailyUpdates, notifications, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getMemoryStore, saveToDisk } from "@/lib/dataStore";
import type { DailyUpdate } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const filter = searchParams.get("filter"); // "today", "week", "month", "all"
    const search = searchParams.get("search");

    if (process.env.DATABASE_URL) {
      try {
        const query = db
          .select({
            id: dailyUpdates.id,
            userId: dailyUpdates.userId,
            userName: users.name,
            userRole: users.role,
            department: users.department,
            avatar: users.avatar,
            date: dailyUpdates.date,
            taskType: dailyUpdates.taskType,
            description: dailyUpdates.description,
            tickets: dailyUpdates.tickets,
            chats: dailyUpdates.chats,
            kyc: dailyUpdates.kyc,
            calls: dailyUpdates.calls,
            emails: dailyUpdates.emails,
            trainingHours: dailyUpdates.trainingHours,
            attachmentUrl: dailyUpdates.attachmentUrl,
            attachmentName: dailyUpdates.attachmentName,
            createdAt: dailyUpdates.createdAt,
          })
          .from(dailyUpdates)
          .leftJoin(users, eq(dailyUpdates.userId, users.id))
          .orderBy(desc(dailyUpdates.date), desc(dailyUpdates.createdAt));

        const rows = await query;
        let filtered = rows;
        if (userId) {
          const uId = parseInt(userId);
          filtered = filtered.filter((r) => r.userId === uId);
        }

        if (search) {
          const s = search.toLowerCase();
          filtered = filtered.filter(
            (r) =>
              r.taskType.toLowerCase().includes(s) ||
              r.description.toLowerCase().includes(s) ||
              r.userName?.toLowerCase().includes(s)
          );
        }

        const todayStr = new Date().toISOString().split("T")[0];
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

        if (filter === "today") {
          filtered = filtered.filter((r) => r.date === todayStr);
        } else if (filter === "week") {
          filtered = filtered.filter((r) => r.date >= sevenDaysAgo);
        } else if (filter === "month") {
          filtered = filtered.filter((r) => r.date >= thirtyDaysAgo);
        }

        return NextResponse.json({ updates: filtered });
      } catch (dbErr) {
        console.warn("Updates DB GET bypassed, utilizing active data store.");
      }
    }

    // Memory Store Fallback
    const store = getMemoryStore();
    let memRows = (store.dailyUpdates || []).map((u) => {
      const user = store.users.find((usr) => usr.id === u.userId);
      return {
        ...u,
        userName: user?.name || "Team Member",
        userRole: user?.role || "employee",
        department: user?.department || "General",
        avatar: user?.avatar || null,
      };
    });

    if (userId) {
      const uId = parseInt(userId);
      memRows = memRows.filter((r) => r.userId === uId);
    }

    if (search) {
      const s = search.toLowerCase();
      memRows = memRows.filter(
        (r) =>
          r.taskType.toLowerCase().includes(s) ||
          r.description.toLowerCase().includes(s) ||
          r.userName?.toLowerCase().includes(s)
      );
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    if (filter === "today") {
      memRows = memRows.filter((r) => r.date === todayStr);
    } else if (filter === "week") {
      memRows = memRows.filter((r) => r.date >= sevenDaysAgo);
    } else if (filter === "month") {
      memRows = memRows.filter((r) => r.date >= thirtyDaysAgo);
    }

    return NextResponse.json({ updates: memRows });
  } catch (error: any) {
    console.error("Updates GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      date,
      taskType,
      description,
      tickets,
      chats,
      kyc,
      calls,
      emails,
      trainingHours,
      attachmentName,
      attachmentUrl,
    } = body;

    if (!userId || !taskType || !description) {
      return NextResponse.json(
        { error: "User, task type, and description are required." },
        { status: 400 }
      );
    }

    const todayDate = date || new Date().toISOString().split("T")[0];

    if (process.env.DATABASE_URL) {
      try {
        const inserted = await db
          .insert(dailyUpdates)
          .values({
            userId: parseInt(userId),
            date: todayDate,
            taskType,
            description,
            tickets: Number(tickets) || 0,
            chats: Number(chats) || 0,
            kyc: Number(kyc) || 0,
            calls: Number(calls) || 0,
            emails: Number(emails) || 0,
            trainingHours: (Number(trainingHours) || 0).toFixed(2),
            attachmentName: attachmentName || null,
            attachmentUrl: attachmentUrl || null,
          })
          .returning();

        await db.insert(notifications).values({
          userId: parseInt(userId),
          title: "Daily Update Recorded",
          message: `Your update for ${taskType} on ${todayDate} has been saved.`,
          type: "info",
          isRead: 0,
        });

        return NextResponse.json({ success: true, update: inserted[0] });
      } catch (dbErr) {
        console.warn("Updates DB POST bypassed, utilizing active data store.");
      }
    }

    // Memory Store Fallback
    const store = getMemoryStore();
    const newId = (store.dailyUpdates.length > 0 ? Math.max(...store.dailyUpdates.map((u) => u.id)) : 0) + 1;
    const newUpdate: DailyUpdate = {
      id: newId,
      userId: parseInt(userId),
      date: todayDate,
      taskType,
      description: String(description).trim(),
      tickets: Number(tickets) || 0,
      chats: Number(chats) || 0,
      kyc: Number(kyc) || 0,
      calls: Number(calls) || 0,
      emails: Number(emails) || 0,
      trainingHours: (Number(trainingHours) || 0).toFixed(2),
      attachmentName: attachmentName || null,
      attachmentUrl: attachmentUrl || null,
      createdAt: new Date().toISOString(),
    };

    store.dailyUpdates.unshift(newUpdate);
    store.notifications.unshift({
      id: Date.now(),
      userId: parseInt(userId),
      title: "Daily Update Recorded",
      message: `Your update for ${taskType} on ${todayDate} has been saved.`,
      type: "info",
      isRead: 0,
      createdAt: new Date().toISOString(),
    });
    saveToDisk(store);

    return NextResponse.json({ success: true, update: newUpdate });
  } catch (error: any) {
    console.error("Updates POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const int = (v: unknown, fallback: number) => (v === undefined ? fallback : Math.max(0, Math.round(Number(v)) || 0));

    if (process.env.DATABASE_URL) {
      try {
        const current = (await db.select().from(dailyUpdates).where(eq(dailyUpdates.id, Number(id))))[0];
        if (current) {
          const description = typeof body.description === "string" ? body.description.trim() : current.description;
          if (!description) return NextResponse.json({ error: "Description is required" }, { status: 400 });

          const [row] = await db
            .update(dailyUpdates)
            .set({
              date: typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : current.date,
              taskType: typeof body.taskType === "string" && body.taskType.trim() ? body.taskType.trim() : current.taskType,
              description,
              tickets: int(body.tickets, current.tickets),
              chats: int(body.chats, current.chats),
              kyc: int(body.kyc, current.kyc),
              calls: int(body.calls, current.calls),
              emails: int(body.emails, current.emails),
              trainingHours:
                body.trainingHours === undefined ? current.trainingHours : Math.max(0, Number(body.trainingHours) || 0).toFixed(2),
            })
            .where(eq(dailyUpdates.id, current.id))
            .returning();
          return NextResponse.json({ success: true, update: row });
        }
      } catch (dbErr) {
        console.warn("Updates DB PATCH bypassed, utilizing active data store.");
      }
    }

    // Memory Store Fallback
    const store = getMemoryStore();
    const cur = store.dailyUpdates.find((u) => u.id === Number(id));
    if (!cur) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    if (body.description !== undefined) {
      const desc = String(body.description).trim();
      if (!desc) return NextResponse.json({ error: "Description is required" }, { status: 400 });
      cur.description = desc;
    }
    if (body.date) cur.date = body.date;
    if (body.taskType) cur.taskType = body.taskType;
    if (body.tickets !== undefined) cur.tickets = int(body.tickets, cur.tickets);
    if (body.chats !== undefined) cur.chats = int(body.chats, cur.chats);
    if (body.kyc !== undefined) cur.kyc = int(body.kyc, cur.kyc);
    if (body.calls !== undefined) cur.calls = int(body.calls, cur.calls);
    if (body.emails !== undefined) cur.emails = int(body.emails, cur.emails);
    if (body.trainingHours !== undefined) cur.trainingHours = Math.max(0, Number(body.trainingHours) || 0).toFixed(2);
    saveToDisk(store);

    return NextResponse.json({ success: true, update: cur });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      try {
        await db.delete(dailyUpdates).where(eq(dailyUpdates.id, parseInt(id)));
        return NextResponse.json({ success: true });
      } catch (dbErr) {
        console.warn("Updates DB DELETE bypassed, utilizing active data store.");
      }
    }

    // Memory Store Fallback
    const store = getMemoryStore();
    store.dailyUpdates = store.dailyUpdates.filter((u) => u.id !== parseInt(id));
    saveToDisk(store);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
