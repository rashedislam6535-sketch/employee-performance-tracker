import { NextResponse } from "next/server";
import { getMemoryStore } from "@/lib/dataStore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { title, message, type, department } = await request.json();

    if (!title || !message) {
      return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
    }

    const store = getMemoryStore();
    const targetUsers = department && department !== "All"
      ? store.users.filter((u) => u.department === department)
      : store.users;

    const notifType = type || "system";

    for (const u of targetUsers) {
      store.notifications.unshift({
        id: store.notifications.length + 1,
        userId: u.id,
        title: `[Broadcast] ${title}`,
        message,
        type: notifType,
        isRead: 0,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      deliveredCount: targetUsers.length,
      message: `Notification broadcasted to ${targetUsers.length} employee(s).`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
