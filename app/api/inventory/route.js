import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { CATEGORIES } from "../../../lib/categories";

// GET /api/inventory?database=boards&category=Gloss&q=white
export async function GET(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const database = searchParams.get("database"); // "boards" | "hardware" | null (both)
  const category = searchParams.get("category");
  const q = (searchParams.get("q") || "").trim();

  const where = {};
  if (database) where.database = database;
  if (category) where.category = category;

  // Case-insensitive match on tag number OR name, as long as the spelling
  // typed so far is correct (this is a "contains" match, not fuzzy).
  // Note: SQLite's `contains` is already case-insensitive for ASCII text by
  // default in Prisma, and SQLite doesn't support the `mode: "insensitive"`
  // option (that's Postgres-only) — so it's deliberately left out here.
  // If you switch the datasource provider to "postgresql" in
  // prisma/schema.prisma, add `mode: "insensitive"` back to both clauses
  // below for non-ASCII-safe case-insensitivity.
  if (q) {
    where.OR = [
      { tagNumber: { contains: q } },
      { name: { contains: q } },
    ];
  }

  const items = await prisma.inventoryItem.findMany({ where, orderBy: { name: "asc" } });
  return NextResponse.json({ items, categories: CATEGORIES });
}

// POST /api/inventory — add one item, or { bulk: [...] } for CSV/pandas imports
export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();

  if (Array.isArray(body.bulk)) {
    const rows = body.bulk.map((r) => ({
      tagNumber: String(r.tagNumber),
      name: String(r.name),
      database: r.database,
      category: r.category,
      quantity: Number(r.quantity) || 0,
      unit: r.unit || null,
      price: r.price != null ? Number(r.price) : null,
      supplier: r.supplier || null,
      notes: r.notes || null,
    }));
    const result = await prisma.inventoryItem.createMany({ data: rows, skipDuplicates: true });
    return NextResponse.json({ created: result.count });
  }

  const { tagNumber, name, database, category, quantity, unit, price, supplier, notes } = body;

  if (!tagNumber || !name || !database || !category) {
    return NextResponse.json({ error: "Tag number, name, database and category are required." }, { status: 400 });
  }
  if (!CATEGORIES[database] || !CATEGORIES[database].includes(category)) {
    return NextResponse.json({ error: `"${category}" isn't a valid category for ${database}.` }, { status: 400 });
  }

  const existing = await prisma.inventoryItem.findUnique({ where: { tagNumber } });
  if (existing) {
    return NextResponse.json({ error: `Tag number ${tagNumber} is already in use.` }, { status: 409 });
  }

  const item = await prisma.inventoryItem.create({
    data: {
      tagNumber,
      name,
      database,
      category,
      quantity: Number(quantity) || 0,
      unit: unit || null,
      price: price != null ? Number(price) : null,
      supplier: supplier || null,
      notes: notes || null,
    },
  });

  return NextResponse.json({ item });
}
