const bcrypt = require("bcryptjs");
const { SignJWT, jwtVerify } = require("jose");
const { cookies } = require("next/headers");

const COOKIE_NAME = "bb_session";
const SHORT_SESSION_SECONDS = 60 * 60 * 8; // 8 hours — used when "keep me logged in" is off
const LONG_SESSION_SECONDS = 60 * 60 * 24 * 30; // 30 days — "keep me logged in / trust this device"

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not set. Copy .env.example to .env and fill it in.");
  }
  return new TextEncoder().encode(secret);
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

async function createSessionToken(user, trustDevice) {
  const expiresInSeconds = trustDevice ? LONG_SESSION_SECONDS : SHORT_SESSION_SECONDS;
  const token = await new SignJWT({
    sub: user.id,
    memberId: user.memberId,
    name: user.name,
    username: user.username,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
    .sign(getSecretKey());

  return { token, expiresInSeconds };
}

async function setSessionCookie(user, trustDevice) {
  const { token, expiresInSeconds } = await createSessionToken(user, trustDevice);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expiresInSeconds,
  });
}

function clearSessionCookie() {
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

async function getSessionUser() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return {
      id: payload.sub,
      memberId: payload.memberId,
      name: payload.name,
      username: payload.username,
    };
  } catch {
    return null;
  }
}

module.exports = {
  COOKIE_NAME,
  hashPassword,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  getSessionUser,
};
