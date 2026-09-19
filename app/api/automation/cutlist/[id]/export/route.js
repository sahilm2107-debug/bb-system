import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/db";
import { getSessionUser } from "../../../../../../lib/auth";
import { buildCutlistCsv } from "../../../../../../lib/cutlist";

export async function GET(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cutlistRequest = await prisma.cutlistRequest.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!cutlistRequest) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const csv = buildCutlistCsv(cutlistRequest);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="cutlist-${cutlistRequest.id}.csv"`,
    },
  });
}
