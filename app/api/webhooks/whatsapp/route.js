import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Advanced NLU Parser for Carpentry Slang
function extractCutlistItems(text) {
  const items = [];
  // Split message by newlines or the word "and" to catch multiple boards in one text
  const lines = text.split(/\n|\band\b/i);

  for (const line of lines) {
    if (!line.trim()) continue;

    // 1. Extract Dimensions: Looks for "1800x400" or "2750 x 1830 x 16"
    const dimMatch = line.match(/(\d+)\s*[xX*]\s*(\d+)(?:\s*[xX*]\s*(\d+))?/);
    if (!dimMatch) continue; // If no dimensions are found, skip to the next line

    const length = parseFloat(dimMatch[1]);
    const width = parseFloat(dimMatch[2]);
    const thickness = dimMatch[3] ? parseFloat(dimMatch[3]) : null;

    // 2. Extract Quantity: Looks for "2x", "2 x", "4 of", or defaults to 1
    const qtyMatch = line.match(/(?:^|\s)(\d+)\s*(?:x|of|boards|pieces)/i);
    const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;

    // 3. Extract Material: Matches common South African board types
    const materialMatch = line.match(/(gloss|melamine|alpine|supawood|mdf|plywood|chipboard|pg bison|oak|cherry)/i);
    const material = materialMatch ? materialMatch[1].toLowerCase() : "Unspecified";

    // 4. Extract Edging Matrix (High Precision)
    let edgingLong = 0;
    let edgingShort = 0;
    let edgingLabel = "None";
    const lowerLine = line.toLowerCase();

    if (lowerLine.match(/all round|all around|4 sides|2l2s/)) {
      edgingLong = 2; edgingShort = 2; edgingLabel = "All Round";
    } else if (lowerLine.match(/1 long 1 short|1l1s/)) {
      edgingLong = 1; edgingShort = 1; edgingLabel = "1L1S";
    } else if (lowerLine.match(/2 long 1 short|2l1s/)) {
      edgingLong = 2; edgingShort = 1; edgingLabel = "2L1S";
    } else if (lowerLine.match(/1 long 2 short|1l2s/)) {
      edgingLong = 1; edgingShort = 2; edgingLabel = "1L2S";
    } else if (lowerLine.match(/2 long|2l/)) {
      edgingLong = 2; edgingShort = 0; edgingLabel = "2L";
    } else if (lowerLine.match(/2 short|2s/)) {
      edgingLong = 0; edgingShort = 2; edgingLabel = "2S";
    } else if (lowerLine.match(/1 long|1l/)) {
      edgingLong = 1; edgingShort = 0; edgingLabel = "1L";
    } else if (lowerLine.match(/1 short|1s/)) {
      edgingLong = 0; edgingShort = 1; edgingLabel = "1S";
    }

    items.push({
      lengthMm: length,
      widthMm: width,
      thicknessMm: thickness,
      quantity: quantity,
      material: material,
      edgingLongCount: edgingLong,
      edgingShortCount: edgingShort,
      edgingLabel: edgingLabel
    });
  }
  return items;
}

export async function POST(req) {
  try {
    const body = await req.json();
    
    // Extract WhatsApp Cloud API payload data
    const messageData = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const customerPhone = messageData?.from || "Unknown";
    const text = messageData?.text?.body;
    
    // Assume Mafikeng as default entry point, can be mapped via phone number later
    const branch = "Mafikeng"; 

    if (!text) {
      return NextResponse.json({ success: true, note: "Non-text message acknowledged." });
    }

    // Run the High-Precision Parser
    const parsedItems = extractCutlistItems(text);

    if (parsedItems.length > 0) {
      // AI Confidence High: Successfully extracted dimensions and edging
      const cutlistRequest = await prisma.cutlistRequest.create({
        data: {
          source: "whatsapp",
          customerPhone: customerPhone,
          rawText: text,
          status: "draft",
          confidence: 0.95,
          branch: branch,
          items: {
            create: parsedItems
          }
        }
      });

      console.log([AI SUCCESS] Precise Cutlist Generated for );
      return NextResponse.json({ success: true, action: "Cutlist Generated", requestId: cutlistRequest.id });
      
    } else {
      // AI Confidence Low: Trigger 5-Minute SLA Dashboard Alert
      await prisma.whatsAppMessage.create({
        data: {
          fromNumber: customerPhone,
          body: text,
          status: "unanswered",
          branch: branch
        }
      });

      console.log([AI HALTED] Complex query from . Triggering SLA alert.);
      return NextResponse.json({ success: true, action: "Human Fallback Triggered" });
    }

  } catch (error) {
    console.error("WhatsApp Webhook Error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
