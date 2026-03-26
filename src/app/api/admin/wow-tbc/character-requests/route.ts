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

function hasCharacterOnUser(
  userData: FirebaseFirestore.DocumentData | undefined,
  normalizedName: string
) {
  const characters = Array.isArray(userData?.characters)
    ? userData.characters
    : [];

  return characters.some((character: { name?: string }) => {
    return (
      typeof character?.name === "string" &&
      normalizeCharacterName(character.name) === normalizedName
    );
  });
}

function getCreatedAtMillis(data: FirebaseFirestore.DocumentData) {
  const createdAt = data?.createdAt;

  if (typeof createdAt?.toMillis === "function") {
    return createdAt.toMillis();
  }

  return 0;
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

    const [usersSnap, requestsSnap] = await Promise.all([
      adminDb.collection("users").get(),
      adminDb.collection("characterRequests").get(),
    ]);

    const existingRequestNames = new Set(
      requestsSnap.docs
        .map((requestDoc) => requestDoc.data())
        .filter((data) => ["pending", "approved"].includes(data.status))
        .map((data) =>
          typeof data.name === "string"
            ? normalizeCharacterName(data.name)
            : ""
        )
        .filter(Boolean)
    );

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const wowApplication = userData?.applications?.["wow-tbc"];
      const mainCharacter =
        typeof wowApplication?.mainCharacter === "string"
          ? wowApplication.mainCharacter.trim()
          : "";

      if (wowApplication?.status !== "approved" || !mainCharacter) {
        continue;
      }

      const normalizedName = normalizeCharacterName(mainCharacter);
      const alreadyRequested = existingRequestNames.has(normalizedName);
      const alreadyLinked = hasCharacterOnUser(userData, normalizedName);

      if (alreadyRequested || alreadyLinked) {
        continue;
      }

      await adminDb.collection("characterRequests").add({
        username: userData?.username || "",
        userId: userDoc.id,
        name: mainCharacter,
        server: "nightslayer",
        region: "US",
        status: "pending",
        createdAt: Timestamp.now(),
      });

      existingRequestNames.add(normalizedName);
    }

    const pendingRequestsSnap = await adminDb
      .collection("characterRequests")
      .where("status", "==", "pending")
      .get();

    const pendingDocs = [...pendingRequestsSnap.docs].sort((a, b) => {
      return getCreatedAtMillis(a.data()) - getCreatedAtMillis(b.data());
    });

    const seenNames = new Set<string>();
    const duplicateUpdates: Promise<FirebaseFirestore.WriteResult>[] = [];
    const requests: Array<{ id: string; [key: string]: unknown }> = [];

    for (const requestDoc of pendingDocs) {
      const data = requestDoc.data();
      const normalizedName =
        typeof data.name === "string"
          ? normalizeCharacterName(data.name)
          : "";

      if (!normalizedName) {
        continue;
      }

      if (seenNames.has(normalizedName)) {
        duplicateUpdates.push(
          requestDoc.ref.update({
            status: "duplicate",
          })
        );
        continue;
      }

      seenNames.add(normalizedName);
      requests.push({
        id: requestDoc.id,
        ...data,
      });
    }

    if (duplicateUpdates.length > 0) {
      await Promise.all(duplicateUpdates);
    }

    return NextResponse.json(requests);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to fetch character requests", message },
      { status: 500 }
    );
  }
}
