import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const branch = searchParams.get("branch") || "Mafikeng";

  try {
    // Example fetching both for the Automation dashboard
    const [cutlists, messages] = await Promise.all([
      prisma.cutlistRequest.findMany({
        where: { branch },
        include: { items: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.whatsAppMessage.findMany({
        where: { branch },
        orderBy: { receivedAt: 'desc' }
      })
    ]);

    return NextResponse.json({ cutlists, messages });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch automation data" }, { status: 500 });
  }
}
