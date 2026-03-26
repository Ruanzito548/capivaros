import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canApproveMembers } from "@/lib/permissions";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
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

export async function PATCH(request: NextRequest, context: RouteContext) {
  const decodedToken = await getAuthenticatedUser(request);

  if (!decodedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const action = body?.action;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const adminUserSnap = await adminDb.collection("users").doc(decodedToken.uid).get();
    const adminRole = adminUserSnap.data()?.role;

    if (!canApproveMembers(adminRole ?? null)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetUserRef = adminDb.collection("users").doc(id);
    const targetUserSnap = await targetUserRef.get();

    if (!targetUserSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetUserData = targetUserSnap.data();
    const wowApplication = targetUserData?.applications?.["wow-tbc"] || {};

    if (wowApplication.status !== "pending") {
      return NextResponse.json(
        { error: "User application is no longer pending" },
        { status: 409 }
      );
    }

    const nextStatus = action === "approve" ? "approved" : "rejected";
    const nextRole = action === "approve" ? "member" : targetUserData?.role;

    const applications = {
      ...(targetUserData?.applications || {}),
      "wow-tbc": {
        ...wowApplication,
        status: nextStatus,
      },
    };

    await targetUserRef.set(
      {
        role: nextRole,
        applications,
      },
      { merge: true }
    );

    if (action === "reject") {
      return NextResponse.json({ success: true });
    }

    const mainCharacter =
      typeof wowApplication.mainCharacter === "string"
        ? wowApplication.mainCharacter.trim()
        : "";

    if (!mainCharacter) {
      return NextResponse.json({ success: true });
    }

    const normalizedName = normalizeCharacterName(mainCharacter);

    const [existingRequestsSnap, usersSnap] = await Promise.all([
      adminDb.collection("characterRequests").get(),
      adminDb.collection("users").get(),
    ]);

    const alreadyRequested = existingRequestsSnap.docs.some((requestDoc) => {
      const requestData = requestDoc.data();

      return (
        ["pending", "approved"].includes(requestData.status) &&
        typeof requestData.name === "string" &&
        normalizeCharacterName(requestData.name) === normalizedName
      );
    });

    const alreadyLinked = usersSnap.docs.some((userDoc) => {
      const userData = userDoc.data();
      const characters = Array.isArray(userData?.characters)
        ? userData.characters
        : [];

      return characters.some((character: { name?: string }) => {
        return (
          typeof character?.name === "string" &&
          normalizeCharacterName(character.name) === normalizedName
        );
      });
    });

    if (!alreadyRequested && !alreadyLinked) {
      await adminDb.collection("characterRequests").add({
        username: targetUserData?.username || "",
        userId: id,
        name: mainCharacter,
        server: "nightslayer",
        region: "US",
        status: "pending",
        createdAt: Timestamp.now(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to process member approval", message },
      { status: 500 }
    );
  }
}
