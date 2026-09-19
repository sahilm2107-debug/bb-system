import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getSessionUser } from "../../../../lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const messages = await prisma.whatsAppMessage.findMany({ orderBy: { receivedAt: "desc" }, take: 50 });
  return NextResponse.json({ messages });
}

// Mark a message as answered (called when a Sales Rep replies in WhatsApp
// Business and that webhook is wired up, or manually from this dashboard).
export async function PATCH(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, status } = await request.json();
  if (!id || !["answered", "escalated", "unanswered"].includes(status)) {
    return NextResponse.json({ error: "A valid id and status are required." }, { status: 400 });
  }

  const message = await prisma.whatsAppMessage.update({
    where: { id },
    data: {
      status,
      answeredAt: status === "answered" ? new Date() : undefined,
    },
  });

  return NextResponse.json({ message });
}
