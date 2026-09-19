import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { getSessionUser } from "../../../../lib/auth";

// Soft delete: marks the employee inactive instead of removing the row,
// so their historical DailyWorkLog entries (boards cut/edged, past
// attendance) stay intact for reporting. The Employee Summary page only
// lists active employees, so this makes them disappear from the day-to-day
// view without losing the record.
export async function DELETE(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.employee.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  await prisma.employee.update({ where: { id: params.id }, data: { active: false } });

  return NextResponse.json({ deleted: true });
}
