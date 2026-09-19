import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request) {
  // 1. Extract the branch from the URL (?branch=Mafikeng)
  const { searchParams } = new URL(request.url);
  const branch = searchParams.get("branch") || "Mafikeng";

  // 2. Inject { branch } into every query
  const [pendingOrders, unanswered, tasksToday, notifications] = await Promise.all([
    prisma.order.findMany({ where: { status: 'pending', branch } }),
    prisma.whatsAppMessage.findMany({ where: { status: 'unanswered', branch } }),
    prisma.task.findMany({ where: { completed: false, branch } }),
    prisma.notification.findMany({ where: { read: false, branch } })
  ]);

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const summaries = {
    lastDay: await prisma.order.findMany({ where: { branch, createdAt: { gte: oneDayAgo } } }),
    lastWeek: await prisma.order.findMany({ where: { branch, createdAt: { gte: oneWeekAgo } } }),
    lastMonth: await prisma.order.findMany({ where: { branch, createdAt: { gte: oneMonthAgo } } })
  };

  return NextResponse.json({ pendingOrders, unanswered, tasksToday, notifications, summaries });
}
