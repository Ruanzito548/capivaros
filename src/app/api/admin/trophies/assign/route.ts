import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canManageRoles } from "@/lib/permissions";

export const runtime = "nodejs";

interface AssignPayload {
  userId?: string;
  trophyId?: string;
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

export async function POST(request: NextRequest) {
  const decodedToken = await getAuthenticatedUser(request);

  if (!decodedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminUserSnap = await adminDb.collection("users").doc(decodedToken.uid).get();
    const adminRole = adminUserSnap.data()?.role;

    if (!canManageRoles(adminRole ?? null)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as AssignPayload;
    const userId = body.userId?.trim();
    const trophyId = body.trophyId?.trim();

    if (!userId || !trophyId) {
      return NextResponse.json(
        { error: "userId and trophyId are required" },
        { status: 400 }
      );
    }

    const [userSnap, trophySnap] = await Promise.all([
      adminDb.collection("users").doc(userId).get(),
      adminDb.collection("trophies").doc(trophyId).get(),
    ]);

    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!trophySnap.exists) {
      return NextResponse.json({ error: "Trophy not found" }, { status: 404 });
    }

    const userData = userSnap.data() || {};
    const trophyData = trophySnap.data() || {};

    if (trophyData.game !== "wow-tbc") {
      return NextResponse.json(
        { error: "Only wow-tbc trophies are supported here" },
        { status: 400 }
      );
    }

    const currentTrophies = Array.isArray(userData.trophies?.["wow-tbc"])
      ? userData.trophies["wow-tbc"]
      : [];

    const alreadyAssigned = currentTrophies.some(
      (trophy: { id?: string; name?: string }) =>
        trophy.id === trophyId || trophy.name === trophyData.name
    );

    if (alreadyAssigned) {
      return NextResponse.json(
        { error: "This trophy is already assigned to the selected user" },
        { status: 409 }
      );
    }

    const nextWowTbcTrophies = [
      ...currentTrophies,
      {
        id: trophySnap.id,
        name: trophyData.name || "Sem nome",
        description: trophyData.description || "",
        icon: trophyData.icon || "🏆",
        awardedAt: Date.now(),
      },
    ];

    await userSnap.ref.set(
      {
        trophies: {
          ...(userData.trophies || {}),
          "wow-tbc": nextWowTbcTrophies,
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Failed to assign trophy",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
