import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const branch = searchParams.get("branch") || "Mafikeng";
  
  const categories = await prisma.category.findMany({ 
    where: { branch },
    orderBy: { name: 'asc' }
  });
  
  return NextResponse.json(categories);
}

export async function POST(request) {
  try {
    const { name, database, branch } = await request.json();
    
    const newCategory = await prisma.category.create({
      data: { name, database, branch: branch || "Mafikeng" }
    });
    
    return NextResponse.json({ success: true, category: newCategory });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create category or it already exists." }, { status: 400 });
  }
}
