import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
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

function normalizeCharacterName(value: string) {
  return value.trim().toLowerCase();
}

async function isCharacterTaken(name: string, userId: string) {
  const normalizedName = normalizeCharacterName(name);

  const [usersSnapshot, requestsSnapshot] = await Promise.all([
    adminDb.collection("users").get(),
    adminDb.collection("characterRequests").get(),
  ]);

  const existsInUsers = usersSnapshot.docs.some((userDoc) => {
    const userData = userDoc.data();
    const mainCharacter = userData.applications?.["wow-tbc"]?.mainCharacter;
    const characters = Array.isArray(userData.characters)
      ? userData.characters
      : [];

    if (
      userDoc.id !== userId &&
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

  if (existsInUsers) {
    return true;
  }

  return requestsSnapshot.docs.some((requestDoc) => {
    const requestData = requestDoc.data();
    const requestName = requestData.name;
    const requestStatus = requestData.status;

    if (
      typeof requestName !== "string" ||
      !["pending", "approved"].includes(requestStatus)
    ) {
      return false;
    }

    if (
      requestData.userId === userId &&
      normalizeCharacterName(requestName) === normalizedName
    ) {
      return true;
    }

    return normalizeCharacterName(requestName) === normalizedName;
  });
}

export async function POST(request: NextRequest) {
  const decodedToken = await getAuthenticatedUser(request);

  if (!decodedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const server = typeof body.server === "string" ? body.server.trim() : "";
    const region = typeof body.region === "string" ? body.region.trim() : "";
    const setAsMainCharacter = Boolean(body.setAsMainCharacter);

    if (!name || !server || !region) {
      return NextResponse.json(
        { error: "Name, server, and region are required" },
        { status: 400 }
      );
    }

    if (await isCharacterTaken(name, decodedToken.uid)) {
      return NextResponse.json(
        { error: "Character already linked to another account" },
        { status: 409 }
      );
    }

    const userRef = adminDb.collection("users").doc(decodedToken.uid);
    const userSnapshot = await userRef.get();
    const userData = userSnapshot.data();
    const username = userData?.username;

    if (!username) {
      return NextResponse.json(
        { error: "User profile incomplete" },
        { status: 400 }
      );
    }

    if (setAsMainCharacter) {
      const applications = userData?.applications || {};
      applications["wow-tbc"] = {
        ...(applications["wow-tbc"] || {}),
        mainCharacter: name,
      };

      await userRef.set({ applications }, { merge: true });
    }

    const created = await adminDb.collection("characterRequests").add({
      username,
      userId: decodedToken.uid,
      name,
      server,
      region,
      status: "pending",
      createdAt: Timestamp.now(),
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to create character request", message },
      { status: 500 }
    );
  }
}
