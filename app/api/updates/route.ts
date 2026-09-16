import { NextResponse } from "next/server";
import { db } from "@/db";
import { dailyUpdates, notifications, users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const filter = searchParams.get("filter"); // "today", "week", "month", "all"
    const search = searchParams.get("search");

    let query = db
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

    // Trigger notification
    await db.insert(notifications).values({
      userId: parseInt(userId),
      title: "Daily Update Recorded",
      message: `Your update for ${taskType} on ${todayDate} has been saved.`,
      type: "info",
      isRead: 0,
    });

    return NextResponse.json({ success: true, update: inserted[0] });
  } catch (error: any) {
    console.error("Updates POST Error:", error);
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

    await db.delete(dailyUpdates).where(eq(dailyUpdates.id, parseInt(id)));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
