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
        skipDuplicates: true
      });
      return NextResponse.json({ success: true, created: created.count });
    }

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
    return NextResponse.json({ error: "Failed to add item. Tag number might already exist." }, { status: 400 });
  }
}

// NEW: Handle Updating Existing Items
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, tagNumber, name, database, category, quantity, unit, price, supplier } = body;
    
    if (!id) return NextResponse.json({ error: "Item ID required" }, { status: 400 });

    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        tagNumber,
        name,
        database: database?.toLowerCase(),
        category,
        quantity: parseInt(quantity) || 0,
        unit: unit || "",
        price: parseFloat(price) || null,
        supplier: supplier || "",
      }
    });

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error) {
    console.error("Update Error:", error);
    return NextResponse.json({ error: "Failed to update item." }, { status: 400 });
  }
}
