import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getSessionUser } from "../../../../lib/auth";

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [pendingOrders, unanswered, tasksToday, notifications] = await Promise.all([
    prisma.order.findMany({ where: { status: "pending" }, orderBy: { createdAt: "desc" } }),
    prisma.whatsAppMessage.findMany({
      where: { status: { in: ["unanswered", "escalated"] } },
      orderBy: { receivedAt: "desc" },
    }),
    prisma.task.findMany({ where: { completed: false }, orderBy: { createdAt: "asc" } }),
    prisma.notification.findMany({ where: { read: false }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const [lastDay, lastWeek, lastMonth] = await Promise.all([
    prisma.order.findMany({ where: { createdAt: { gte: daysAgo(1) } }, orderBy: { createdAt: "desc" } }),
    prisma.order.findMany({ where: { createdAt: { gte: daysAgo(7) } }, orderBy: { createdAt: "desc" } }),
    prisma.order.findMany({ where: { createdAt: { gte: daysAgo(30) } }, orderBy: { createdAt: "desc" } }),
  ]);

  return NextResponse.json({
    pendingOrders,
    unanswered,
    tasksToday,
    notifications,
    summaries: {
      lastDay,
      lastWeek,
      lastMonth,
    },
  });
}
