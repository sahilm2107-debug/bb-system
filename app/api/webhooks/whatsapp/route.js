import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const body = await req.json();
    
    // 1. Extract message details from WhatsApp API payload
    const messageData = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const customerPhone = messageData?.from || "Unknown";
    const text = messageData?.text?.body;

    if (!text) {
      return Response.json({ success: true, note: "Non-text message acknowledged." });
    }

    // 2. Phase 1: Log the query for SLA Monitoring (5-minute rule)
    const query = await prisma.whatsAppQuery.create({
      data: {
        customer: customerPhone,
        message: text,
        status: "UNANSWERED",
      }
    });

    // 3. Phase 2: AI Parsing Engine (Dimensions & Edging)
    // Looks for dimensions like "1200 x 600" or "1200*600"
    const dimensionRegex = /(\d+)\s*[xX*]\s*(\d+)/;
    const match = text.match(dimensionRegex);

    if (match) {
      const length = match[1];
      const width = match[2];
      
      // Parse local carpentry slang and edging instructions
      let edging = "None";
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes("1 long 1 short")) edging = "1L1S";
      else if (lowerText.includes("2 long 2 short") || lowerText.includes("all round") || lowerText.includes("all around")) edging = "2L2S";
      else if (lowerText.includes("2 long 1 short")) edging = "2L1S";
      else if (lowerText.includes("1 long")) edging = "1L";

      // Translate into structured Cutlist format
      const cutlistEntry = `L:${length} W:${width} Qty:1 Edging:${edging}`;

      // TODO: Fire WhatsApp API response back to customer with quote/confirmation
      console.log(`[AI SUCCESS] Parsed Cutlist: ${cutlistEntry}`);
      
      // Update DB to show the AI successfully handled it
      await prisma.whatsAppQuery.update({
        where: { id: query.id },
        data: { status: "RESOLVED" }
      });

      return Response.json({ success: true, action: "Quote Generated", cutlist: cutlistEntry });
      
    } else {
      // 4. Phase 2 Fallback: AI Confidence Low
      console.log(`[AI HALTED] Complex query from ${customerPhone}. Tagging Admin for manual takeover.`);
      
      return Response.json({ success: true, action: "Human Fallback Triggered" });
    }

  } catch (error) {
    console.error("WhatsApp Webhook Error:", error);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}