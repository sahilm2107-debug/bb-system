import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const employees = await prisma.employee.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ employees });
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { employeeCode, name, role } = await request.json();
  if (!employeeCode || !name) {
    return NextResponse.json({ error: "Employee code and name are required." }, { status: 400 });
  }

  const existing = await prisma.employee.findUnique({ where: { employeeCode } });
  if (existing) {
    return NextResponse.json({ error: `Employee code ${employeeCode} is already in use.` }, { status: 409 });
  }

  const employee = await prisma.employee.create({ data: { employeeCode, name, role: role || null } });
  return NextResponse.json({ employee });
}
