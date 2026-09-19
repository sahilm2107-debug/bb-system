import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";
import { getSessionUser } from "../../../../../lib/auth";

export async function GET(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cutlistRequest = await prisma.cutlistRequest.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!cutlistRequest) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({ request: cutlistRequest });
}

// Human confirmation step. Only "confirmed" or "rejected" are valid here
// — the request must already have gone through parsing + CSV export
// (status "pending_confirmation") before an admin can act on it.
export async function PATCH(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await request.json();
  if (!["confirmed", "rejected"].includes(status)) {
    return NextResponse.json({ error: "status must be 'confirmed' or 'rejected'." }, { status: 400 });
  }

  const cutlistRequest = await prisma.cutlistRequest.update({
    where: { id: params.id },
    data: {
      status,
      confirmedAt: status === "confirmed" ? new Date() : undefined,
      rejectedAt: status === "rejected" ? new Date() : undefined,
    },
    include: { items: true },
  });

  return NextResponse.json({ request: cutlistRequest });
}
