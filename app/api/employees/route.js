import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const body = await request.json();
    
    const newEmployee = await prisma.employee.create({
      data: {
        employeeCode: body.employeeCode,
        name: body.name,
        role: body.role,
        branch: body.branch || "Mafikeng" // Saves the branch sent from the frontend
      }
    });
    
    return NextResponse.json(newEmployee);
  } catch (error) {
    return NextResponse.json({ error: "Failed to add employee. Ensure the Employee Code is unique." }, { status: 500 });
  }
}
