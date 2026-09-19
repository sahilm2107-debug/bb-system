import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { hashPassword, setSessionCookie } from "../../../../lib/auth";

const ALL_MEMBER_IDS = ["001", "002", "003", "004", "005"];

export async function POST(request) {
  const { name, memberId, username, password } = await request.json();

  if (!name || !memberId || !username || !password) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  if (!ALL_MEMBER_IDS.includes(memberId)) {
    return NextResponse.json(
      { error: "Member ID must be one of 001–005." },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existingCount = await prisma.user.count();
  if (existingCount >= 5) {
    return NextResponse.json(
      { error: "B&B System is limited to 5 registered admins. All seats are taken." },
      { status: 403 }
    );
  }

  const [memberIdTaken, usernameTaken] = await Promise.all([
    prisma.user.findUnique({ where: { memberId } }),
    prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } }),
  ]);

  if (memberIdTaken) {
    return NextResponse.json({ error: `Member ID ${memberId} is already registered.` }, { status: 409 });
  }
  if (usernameTaken) {
    return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      memberId,
      username: username.trim().toLowerCase(),
      passwordHash,
    },
  });

  await setSessionCookie(user, false);

  return NextResponse.json({
    user: { name: user.name, memberId: user.memberId, username: user.username },
  });
}
