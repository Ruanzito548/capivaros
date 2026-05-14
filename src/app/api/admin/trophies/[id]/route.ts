import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canManageRoles } from "@/lib/permissions";

export const runtime = "nodejs";

interface TrophyPayload {
  name?: string;
  description?: string;
  icon?: string;
  points?: number;
  rarity?: string;
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

async function ensureFounder(request: NextRequest) {
  const decodedToken = await getAuthenticatedUser(request);

  if (!decodedToken) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const adminUserSnap = await adminDb.collection("users").doc(decodedToken.uid).get();
  const adminRole = adminUserSnap.data()?.role;

  if (!canManageRoles(adminRole ?? null)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { decodedToken };
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await ensureFounder(request);

  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as TrophyPayload;

    const name = body.name?.trim();
    const description = body.description?.trim();
    const icon = body.icon?.trim() || "🏆";
    const points = Number.isFinite(body.points) ? Number(body.points) : 0;
    const rarity = body.rarity?.trim() || "Comum";

    if (!name || !description) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 }
      );
    }

    if (points < 0) {
      return NextResponse.json(
        { error: "Points cannot be negative" },
        { status: 400 }
      );
    }

    const trophyRef = adminDb.collection("trophies").doc(id);
    const trophySnap = await trophyRef.get();

    if (!trophySnap.exists) {
      return NextResponse.json({ error: "Trophy not found" }, { status: 404 });
    }

    const trophyData = trophySnap.data() || {};

    if (trophyData.game !== "wow-tbc") {
      return NextResponse.json(
        { error: "Only wow-tbc trophies are supported here" },
        { status: 400 }
      );
    }

    if (name !== trophyData.name) {
      const duplicateSnapshot = await adminDb
        .collection("trophies")
        .where("game", "==", "wow-tbc")
        .where("name", "==", name)
        .get();

      const duplicateExists = duplicateSnapshot.docs.some((docSnap) => docSnap.id !== id);

      if (duplicateExists) {
        return NextResponse.json(
          { error: "A trophy with this name already exists" },
          { status: 409 }
        );
      }
    }

    await trophyRef.update({
      name,
      description,
      icon,
      points,
      rarity,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: authResult.decodedToken.uid,
    });

    return NextResponse.json({
      success: true,
      trophy: {
        id,
        name,
        description,
        icon,
        points,
        rarity,
        game: "wow-tbc",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Failed to update trophy",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}