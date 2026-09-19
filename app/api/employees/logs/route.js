import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dateString = searchParams.get("date"); 
  const branch = searchParams.get("branch") || "Mafikeng";

  const targetDate = new Date(dateString + "T00:00:00.000Z");

  // Filter employees and logs by the active branch
  const employees = await prisma.employee.findMany({
    where: { active: true, branch }
  });

  const logs = await prisma.dailyWorkLog.findMany({
    where: { date: targetDate, branch }
  });

  let totals = { present: 0, boardsCut: 0, boardsEdged: 0 };
  const rows = employees.map(emp => {
    const log = logs.find(l => l.employeeId === emp.id);
    if (log && log.present) totals.present++;
    if (log) {
      totals.boardsCut += log.boardsCut;
      totals.boardsEdged += log.boardsEdged;
    }
    return { employee: emp, log: log || null };
  });

  return NextResponse.json({ totals, rows });
}

export async function POST(request) {
  const body = await request.json();
  const { employeeId, date, present, boardsCut, boardsEdged } = body;
  const targetDate = new Date(date + "T00:00:00.000Z");

  // Find the employee to inherit their branch assignment
  const emp = await prisma.employee.findUnique({ where: { id: employeeId } });

  const log = await prisma.dailyWorkLog.upsert({
    where: { employeeId_date: { employeeId, date: targetDate } },
    update: { present, boardsCut: parseInt(boardsCut), boardsEdged: parseInt(boardsEdged) },
    create: {
      employeeId,
      date: targetDate,
      present,
      boardsCut: parseInt(boardsCut),
      boardsEdged: parseInt(boardsEdged),
      branch: emp?.branch || "Mafikeng"
    }
  });
  return NextResponse.json({ success: true, log });
}
