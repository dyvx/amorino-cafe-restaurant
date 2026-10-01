import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  verifyPassword,
  signSessionToken,
  SESSION_COOKIE_NAME,
  UserRole,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");
    const quickRole = body.quickRole as UserRole | undefined;

    let userRow: any = null;

    if (quickRole && ["ADMIN", "STAFF", "KITCHEN"].includes(quickRole)) {
      userRow = db
        .prepare("SELECT * FROM users WHERE role = ? AND is_active = 1 LIMIT 1")
        .get(quickRole);
    } else {
      if (!email || !password) {
        return NextResponse.json(
          { error: "Please enter both email and password." },
          { status: 400 }
        );
      }

      const candidate = db
        .prepare("SELECT * FROM users WHERE LOWER(email) = ? AND is_active = 1")
        .get(email) as any;

      if (!candidate || !verifyPassword(password, candidate.password_hash)) {
        return NextResponse.json(
          { error: "Invalid credentials. Please check your email and password." },
          { status: 401 }
        );
      }
      userRow = candidate;
    }

    if (!userRow) {
      return NextResponse.json(
        { error: "User account not found or inactive." },
        { status: 404 }
      );
    }

    const sessionUser = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role as UserRole,
    };

    const token = signSessionToken(sessionUser);
    const response = NextResponse.json({ user: sessionUser, token });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { error: "Authentication failed. Please try again." },
      { status: 500 }
    );
  }
}
