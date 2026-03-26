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

export async function GET(request: NextRequest) {
  const decodedToken = await getAuthenticatedUser(request);

  if (!decodedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminUserSnap = await adminDb.collection("users").doc(decodedToken.uid).get();
    const adminRole = adminUserSnap.data()?.role;

    if (adminRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const usersSnap = await adminDb.collection("users").get();

    const linkedCharacters = usersSnap.docs.flatMap((userDoc) => {
      const userData = userDoc.data();
      const characters = Array.isArray(userData?.characters)
        ? userData.characters
        : [];

      return characters
        .filter((character: { name?: string; server?: string }) => {
          return typeof character?.name === "string";
        })
        .map((character: { name: string; server?: string }) => ({
          userId: userDoc.id,
          username: userData?.username || "Sem username",
          characterName: character.name,
          server: character.server || "nightslayer",
        }));
    });

    linkedCharacters.sort((a, b) =>
      a.characterName.localeCompare(b.characterName, "pt-BR", {
        sensitivity: "base",
      })
    );

    return NextResponse.json(linkedCharacters);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to fetch linked characters", message },
      { status: 500 }
    );
  }
}
