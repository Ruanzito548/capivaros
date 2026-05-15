import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

async function getAuthenticatedUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    return null;
  }

  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    return null;
  }
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function isUsernameValid(value: string) {
  return /^[a-zA-Z0-9]+$/.test(value);
}

function hasWhitespace(value: string) {
  return /\s/.test(value);
}

async function isUsernameTaken(username: string, currentUserId: string) {
  const normalizedUsername = normalizeUsername(username);
  const snapshot = await adminDb.collection("users").get();

  return snapshot.docs.some((userDoc) => {
    if (userDoc.id === currentUserId) {
      return false;
    }

    const existingUsername = userDoc.data().username;
    if (typeof existingUsername !== "string") {
      return false;
    }

    return normalizeUsername(existingUsername) === normalizedUsername;
  });
}

export async function POST(request: NextRequest) {
  const decodedToken = await getAuthenticatedUser(request);

  if (!decodedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const username =
      typeof body.username === "string" ? body.username.trim() : "";
    const discord =
      typeof body.discord === "string" ? body.discord.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    if (!username || !discord) {
      return NextResponse.json(
        { error: "Username and discord are required" },
        { status: 400 }
      );
    }

    if (!isUsernameValid(username)) {
      return NextResponse.json(
        { error: "Username must use only letters and numbers" },
        { status: 400 }
      );
    }

    if (hasWhitespace(discord) || hasWhitespace(phone)) {
      return NextResponse.json(
        { error: "Discord and phone cannot contain spaces" },
        { status: 400 }
      );
    }

    if (await isUsernameTaken(username, decodedToken.uid)) {
      return NextResponse.json(
        { error: "Username already in use" },
        { status: 409 }
      );
    }

    await adminDb.collection("users").doc(decodedToken.uid).set(
      {
        username,
        discord,
        phone,
        role: "visitor",
        games: [],
        profileCompleted: true,
        createdAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to save profile", message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const decodedToken = await getAuthenticatedUser(request);

  if (!decodedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const username =
      typeof body.username === "string" ? body.username.trim() : "";
    const photoURL =
      typeof body.photoURL === "string" ? body.photoURL.trim() : "";
    const coverURL =
      typeof body.coverURL === "string" ? body.coverURL.trim() : "";
    const availabilityRaw = body.availability;
    const availability =
      Array.isArray(availabilityRaw) &&
      availabilityRaw.length === 28 &&
      availabilityRaw.every((v) => typeof v === "boolean")
        ? (availabilityRaw as boolean[])
        : null;

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    if (!isUsernameValid(username)) {
      return NextResponse.json(
        { error: "Username must use only letters and numbers" },
        { status: 400 }
      );
    }

    if (await isUsernameTaken(username, decodedToken.uid)) {
      return NextResponse.json(
        { error: "Username already in use" },
        { status: 409 }
      );
    }

    await adminDb.collection("users").doc(decodedToken.uid).set(
      {
        username,
        photoURL,
        coverURL,
        ...(availability !== null && { availability }),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to update profile", message },
      { status: 500 }
    );
  }
}
