import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canManageRoles } from "@/lib/permissions";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface CharacterPayload {
  name: string;
  server: string;
}

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

function normalizeCharacterName(value: string) {
  return value.trim().toLowerCase();
}

function isValidCharacterName(value: string) {
  return /^[a-zA-Z' -]{2,24}$/.test(value);
}

async function isCharacterTaken(name: string, targetUserId: string) {
  const normalizedName = normalizeCharacterName(name);
  const usersSnapshot = await adminDb.collection("users").get();

  return usersSnapshot.docs.some((userDoc) => {
    if (userDoc.id === targetUserId) {
      return false;
    }

    const userData = userDoc.data();
    const mainCharacter = userData?.applications?.["wow-tbc"]?.mainCharacter;
    const characters = Array.isArray(userData?.characters)
      ? userData.characters
      : [];

    if (
      typeof mainCharacter === "string" &&
      normalizeCharacterName(mainCharacter) === normalizedName
    ) {
      return true;
    }

    return characters.some((character: { name?: string }) => {
      return (
        typeof character?.name === "string" &&
        normalizeCharacterName(character.name) === normalizedName
      );
    });
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const decodedToken = await getAuthenticatedUser(request);

  if (!decodedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const adminUserSnap = await adminDb.collection("users").doc(decodedToken.uid).get();
    const adminRole = adminUserSnap.data()?.role;

    if (!canManageRoles(adminRole ?? null)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as Partial<CharacterPayload>;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const server =
      typeof body?.server === "string" && body.server.trim()
        ? body.server.trim()
        : "nightslayer";

    if (!name) {
      return NextResponse.json(
        { error: "Character name is required" },
        { status: 400 }
      );
    }

    if (!isValidCharacterName(name)) {
      return NextResponse.json(
        { error: "Invalid character name" },
        { status: 400 }
      );
    }

    const targetUserRef = adminDb.collection("users").doc(id);
    const targetUserSnap = await targetUserRef.get();

    if (!targetUserSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (await isCharacterTaken(name, id)) {
      return NextResponse.json(
        { error: "Character already linked to another account" },
        { status: 409 }
      );
    }

    const targetUserData = targetUserSnap.data() || {};
    const currentCharacters = Array.isArray(targetUserData.characters)
      ? targetUserData.characters
      : [];

    const alreadyLinkedToTarget = currentCharacters.some((character: { name?: string }) => {
      return (
        typeof character?.name === "string" &&
        normalizeCharacterName(character.name) === normalizeCharacterName(name)
      );
    });

    if (alreadyLinkedToTarget) {
      return NextResponse.json(
        { error: "Character is already linked to this user" },
        { status: 409 }
      );
    }

    const updatedCharacters = [
      ...currentCharacters,
      {
        name,
        server,
      },
    ];

    await targetUserRef.set(
      {
        characters: updatedCharacters,
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to add character", message },
      { status: 500 }
    );
  }
}
