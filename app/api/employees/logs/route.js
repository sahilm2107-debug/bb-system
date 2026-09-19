import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getSessionUser } from "../../../../lib/auth";

function normalizeDate(dateStr) {
  // Stores every log at midnight UTC for its calendar day, so the
  // (employeeId, date) unique constraint reliably means "one row per day"
  // regardless of what time it was saved.
  const d = dateStr ? new Date(dateStr) : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// GET /api/employees/logs?date=2026-09-18 — every active employee plus
// their log for that day (present:false, 0/0 boards if none saved yet).
export async function GET(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = normalizeDate(searchParams.get("date"));

  const employees = await prisma.employee.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const logs = await prisma.dailyWorkLog.findMany({ where: { date } });
  const logByEmployee = Object.fromEntries(logs.map((l) => [l.employeeId, l]));

  const rows = employees.map((e) => ({
    employee: e,
    log: logByEmployee[e.id] || null,
  }));

  const totals = logs.reduce(
    (acc, l) => ({
      present: acc.present + (l.present ? 1 : 0),
      boardsCut: acc.boardsCut + l.boardsCut,
      boardsEdged: acc.boardsEdged + l.boardsEdged,
    }),
    { present: 0, boardsCut: 0, boardsEdged: 0 }
  );

  return NextResponse.json({ date: date.toISOString(), rows, totals });
}

// POST — upsert one employee's log for a given day.
export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeId, date, present, boardsCut, boardsEdged, notes } = await request.json();
  if (!employeeId) {
    return NextResponse.json({ error: "employeeId is required." }, { status: 400 });
  }

  const normalizedDate = normalizeDate(date);

  const log = await prisma.dailyWorkLog.upsert({
    where: { employeeId_date: { employeeId, date: normalizedDate } },
    update: {
      present: Boolean(present),
      boardsCut: Number(boardsCut) || 0,
      boardsEdged: Number(boardsEdged) || 0,
      notes: notes || null,
    },
    create: {
      employeeId,
      date: normalizedDate,
      present: Boolean(present),
      boardsCut: Number(boardsCut) || 0,
      boardsEdged: Number(boardsEdged) || 0,
      notes: notes || null,
    },
  });

  return NextResponse.json({ log });
}
