import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { verifyPassword, setSessionCookie } from "../../../../lib/auth";

export async function POST(request) {
  const { username, password, trustDevice } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } });

  // Same error for "no such user" and "wrong password" — don't leak which one.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  }

  await setSessionCookie(user, Boolean(trustDevice));

  return NextResponse.json({
    user: { name: user.name, memberId: user.memberId, username: user.username },
  });
}
