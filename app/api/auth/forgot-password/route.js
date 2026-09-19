import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../../lib/db";

// No email provider is wired up yet, so the reset link is logged to the
// server console instead of sent. Swap the console.log for your mail
// provider (Resend, SES, etc.) when one is configured.
export async function POST(request) {
  const { username } = await request.json();

  if (!username) {
    return NextResponse.json({ error: "Enter your username." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } });

  // Always respond the same way whether or not the user exists, so this
  // endpoint can't be used to discover valid usernames.
  if (user) {
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    const resetUrl = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;
    console.log(`[B&B System] Password reset requested for ${user.username}: ${resetUrl}`);
  }

  return NextResponse.json({
    message: "If that username exists, a reset link has been generated. Check the server console (email delivery isn't wired up yet).",
  });
}
