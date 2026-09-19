import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getSessionUser } from "../../../../lib/auth";

const SLA_MINUTES = 5;

// Phase 1 of the Automation tab: silent SLA monitoring.
// In production this route is hit by a scheduled job (cron, a queue
// worker, or the WhatsApp Business webhook handler) every minute or so.
// It is safe to call repeatedly — each unanswered message is only
// escalated and notified about once.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cutoff = new Date(Date.now() - SLA_MINUTES * 60 * 1000);

  const overdue = await prisma.whatsAppMessage.findMany({
    where: {
      status: "unanswered",
      receivedAt: { lte: cutoff },
      escalatedAt: null,
    },
  });

  const notifications = [];
  for (const msg of overdue) {
    await prisma.whatsAppMessage.update({
      where: { id: msg.id },
      data: { status: "escalated", escalatedAt: new Date() },
    });

    const notification = await prisma.notification.create({
      data: {
        type: "sla_breach",
        message: `${msg.fromName || msg.fromNumber} has been waiting over ${SLA_MINUTES} minutes: "${msg.body.slice(0, 80)}"`,
        relatedMessageId: msg.id,
      },
    });
    notifications.push(notification);
  }

  return NextResponse.json({ escalated: overdue.length, notifications });
}
