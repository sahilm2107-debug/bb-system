import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const branch = searchParams.get("branch") || "Mafikeng";

  try {
    const items = await prisma.inventoryItem.findMany({
      where: { branch },
      orderBy: { category: 'asc' }
    });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    const newItem = await prisma.inventoryItem.create({
      data: {
        tagNumber: body.tagNumber,
        name: body.name,
        database: body.database,
        category: body.category,
        quantity: body.quantity || 0,
        unit: body.unit,
        price: body.price,
        supplier: body.supplier,
        notes: body.notes,
        branch: body.branch || "Mafikeng" // Tags new items to the active branch
      }
    });
    return NextResponse.json(newItem);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 });
  }
}
