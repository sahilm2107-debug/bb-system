import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const branch = searchParams.get("branch") || "Mafikeng";
  const database = searchParams.get("database") || "boards";
  const category = searchParams.get("category");
  const q = searchParams.get("q");

  let whereClause = { branch, database: database.toLowerCase() };

  if (category) {
    whereClause.category = category;
  }

  if (q) {
    whereClause.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { tagNumber: { contains: q, mode: 'insensitive' } }
    ];
  }

  try {
    const items = await prisma.inventoryItem.findMany({
      where: whereClause,
      orderBy: { tagNumber: 'asc' }
    });
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const branch = body.branch || "Mafikeng";

    // Handle Bulk CSV Import
    if (body.bulk) {
      const created = await prisma.inventoryItem.createMany({
        data: body.bulk.map(item => ({
          tagNumber: item.tagNumber,
          name: item.name,
          database: (item.database || 'boards').toLowerCase(),
          category: item.category || "Uncategorized",
          quantity: parseInt(item.quantity) || 0,
          unit: item.unit || "",
          price: parseFloat(item.price) || null,
          supplier: item.supplier || "",
          branch: item.branch || branch
        })),
        skipDuplicates: true // Prevents crashing if a tag number already exists
      });
      return NextResponse.json({ success: true, created: created.count });
    }

    // Handle Single Item Addition
    const newItem = await prisma.inventoryItem.create({
      data: {
        tagNumber: body.tagNumber,
        name: body.name,
        database: body.database.toLowerCase(),
        category: body.category,
        quantity: parseInt(body.quantity) || 0,
        unit: body.unit || "",
        price: parseFloat(body.price) || null,
        supplier: body.supplier || "",
        branch: branch
      }
    });

    return NextResponse.json({ success: true, item: newItem });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to add item. Tag number might already exist." }, { status: 400 });
  }
}
