import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

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
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }

    const adminUserRef = adminDb.collection("users").doc(decodedToken.uid);
    const requestRef = adminDb.collection("characterRequests").doc(id);

    const [adminUserSnap, requestSnap, usersSnapshot, requestsSnapshot] =
      await Promise.all([
        adminUserRef.get(),
        requestRef.get(),
        adminDb.collection("users").get(),
        adminDb.collection("characterRequests").get(),
      ]);

    const adminRole = adminUserSnap.data()?.role;

    if (adminRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!requestSnap.exists) {
      return NextResponse.json(
        { error: "Character request not found" },
        { status: 404 }
      );
    }

    const requestData = requestSnap.data();

    if (requestData?.status !== "pending") {
      return NextResponse.json(
        { error: "Character request is no longer pending" },
        { status: 409 }
      );
    }

    if (action === "reject") {
      await requestRef.update({ status: "rejected" });
      return NextResponse.json({ success: true });
    }

    const characterName =
      typeof requestData?.name === "string" ? requestData.name : "";
    const normalizedName = normalizeCharacterName(characterName);

    if (!normalizedName) {
      return NextResponse.json(
        { error: "Invalid character name" },
        { status: 400 }
      );
    }

    const duplicateApprovedRequest = requestsSnapshot.docs.find((requestDoc) => {
      if (requestDoc.id === id) {
        return false;
      }

      const data = requestDoc.data();
      return (
        data.status === "approved" &&
        typeof data.name === "string" &&
        normalizeCharacterName(data.name) === normalizedName
      );
    });

    if (duplicateApprovedRequest) {
      return NextResponse.json(
        { error: "Character already approved in another request" },
        { status: 409 }
      );
    }

    const duplicateUser = usersSnapshot.docs.find((userDoc) => {
      return hasCharacterOnUser(userDoc.data(), normalizedName);
    });

    if (duplicateUser) {
      return NextResponse.json(
        { error: "Character already linked to an account" },
        { status: 409 }
      );
    }

    const targetUserRef = adminDb.collection("users").doc(requestData.userId);
    const targetUserSnap = await targetUserRef.get();

    if (!targetUserSnap.exists) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    const targetUserData = targetUserSnap.data();
    const characters = Array.isArray(targetUserData?.characters)
      ? targetUserData.characters
      : [];

    if (hasCharacterOnUser(targetUserData, normalizedName)) {
      return NextResponse.json(
        { error: "Character already linked to this account" },
        { status: 409 }
      );
    }

    characters.push({
      name: requestData.name,
      server: requestData.server,
    });

    const duplicatePendingUpdates = requestsSnapshot.docs
      .filter((requestDoc) => {
        if (requestDoc.id === id) {
          return false;
        }

        const data = requestDoc.data();
        return (
          data.status === "pending" &&
          typeof data.name === "string" &&
          normalizeCharacterName(data.name) === normalizedName
        );
      })
      .map((requestDoc) =>
        requestDoc.ref.update({
          status: "duplicate",
        })
      );

    await Promise.all([
      requestRef.update({ status: "approved" }),
      targetUserRef.update({ characters }),
      ...duplicatePendingUpdates,
    ]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to process character request", message },
      { status: 500 }
    );
  }
}
