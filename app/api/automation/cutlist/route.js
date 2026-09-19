import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getSessionUser } from "../../../../lib/auth";
import { parseCutlistText, buildCutlistCsv } from "../../../../lib/cutlist";

export async function GET(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const requests = await prisma.cutlistRequest.findMany({
    where: status ? { status } : undefined,
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}

// Creates a cutlist request from raw text. Until the real AI/NLU parser
// is built, this is also the manual "test" entry point used from the
// Automation page — the same code path a future WhatsApp handler would
// call once it has transcribed/read an incoming message.
//
// Flow: parse -> save items -> generate the CSV export -> mark
// pending_confirmation so a human admin has to sign off before anything
// is treated as final.
export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rawText, customerName, customerPhone, source, relatedMessageId } = await request.json();

  if (!rawText || !rawText.trim()) {
    return NextResponse.json({ error: "rawText is required." }, { status: 400 });
  }

  const { items, confidence } = parseCutlistText(rawText);

  if (items.length === 0) {
    // Mirrors the fallback rule from the brief: if sizes can't be read,
    // don't create a half-empty cutlist — flag it for a human instead.
    const notification = await prisma.notification.create({
      data: {
        type: "low_confidence",
        message: `Couldn't read any sizes from a cutlist request: "${rawText.slice(0, 80)}"`,
        relatedMessageId: relatedMessageId || null,
      },
    });
    return NextResponse.json(
      { error: "No sizes could be read from that text.", notification },
      { status: 422 }
    );
  }

  const cutlistRequest = await prisma.cutlistRequest.create({
    data: {
      source: source || "manual",
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      rawText,
      confidence,
      relatedMessageId: relatedMessageId || null,
      status: "pending_confirmation",
      csvExportedAt: new Date(),
      items: { create: items },
    },
    include: { items: true },
  });

  return NextResponse.json({ request: cutlistRequest, csvPreview: buildCutlistCsv(cutlistRequest) });
}
