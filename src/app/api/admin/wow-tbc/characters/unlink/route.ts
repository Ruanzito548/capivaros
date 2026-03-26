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

function normalizeCharacterName(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "Character name is required" },
        { status: 400 }
      );
    }

    const normalizedName = normalizeCharacterName(name);

    const [usersSnap, requestsSnap] = await Promise.all([
      adminDb.collection("users").get(),
      adminDb.collection("characterRequests").get(),
    ]);

    let unlinkedFromUsers = 0;
    let updatedRequests = 0;

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const characters = Array.isArray(userData?.characters)
        ? userData.characters
        : [];

      const filteredCharacters = characters.filter((character: { name?: string }) => {
        return (
          typeof character?.name !== "string" ||
          normalizeCharacterName(character.name) !== normalizedName
        );
      });

      const mainCharacter = userData?.applications?.["wow-tbc"]?.mainCharacter;
      const shouldClearMainCharacter =
        typeof mainCharacter === "string" &&
        normalizeCharacterName(mainCharacter) === normalizedName;

      if (
        filteredCharacters.length !== characters.length ||
        shouldClearMainCharacter
      ) {
        const nextApplications = { ...(userData?.applications || {}) };

        if (shouldClearMainCharacter) {
          nextApplications["wow-tbc"] = {
            ...(nextApplications["wow-tbc"] || {}),
            mainCharacter: "",
          };
        }

        await userDoc.ref.set(
          {
            characters: filteredCharacters,
            applications: nextApplications,
          },
          { merge: true }
        );

        unlinkedFromUsers += 1;
      }
    }

    for (const requestDoc of requestsSnap.docs) {
      const requestData = requestDoc.data();
      const requestName = requestData?.name;

      if (
        typeof requestName === "string" &&
        normalizeCharacterName(requestName) === normalizedName &&
        requestData.status !== "unlinked"
      ) {
        await requestDoc.ref.update({
          status: "unlinked",
        });

        updatedRequests += 1;
      }
    }

    return NextResponse.json({
      success: true,
      unlinkedFromUsers,
      updatedRequests,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to unlink character", message },
      { status: 500 }
    );
  }
}
