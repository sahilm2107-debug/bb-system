import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

// Point your WhatsApp Business API webhook at this route.
// This intentionally has no session check — it's called by Meta's
// servers, not a logged-in admin — so verify the request signature
// (X-Hub-Signature-256) against your WhatsApp app secret before trusting
// the body in production. That verification step is left out here since
// it depends on your WhatsApp Business API credentials.
export async function POST(request) {
  const body = await request.json();

  // Expected shape (adapt to match your WhatsApp Business API payload):
  // { fromNumber: "+27821234567", fromName: "Pieter", body: "..." }
  const { fromNumber, fromName, body: text } = body;

  if (!fromNumber || !text) {
    return NextResponse.json({ error: "fromNumber and body are required." }, { status: 400 });
  }

  const message = await prisma.whatsAppMessage.create({
    data: { fromNumber, fromName: fromName || null, body: text, status: "unanswered" },
  });

  // Phase 2 hook point: run transcription/NLU here and, if confidence is
  // high, auto-draft a quote instead of leaving this for a human reply.

  return NextResponse.json({ received: true, id: message.id });
}
