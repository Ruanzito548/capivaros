import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canManageRoles } from "@/lib/permissions";

export const runtime = "nodejs";

interface TrophyPayload {
  name?: string;
  description?: string;
  icon?: string;
}

const DEFAULT_WOW_TBC_TROPHIES = [
  {
    name: "Top 1 Season 1 Karazhan",
    description: "Conquistou o 1 lugar no ranking da Season 1 de Karazhan.",
    icon: "/medalhas/1kara.png",
  },
  {
    name: "Top 2 Season 1 Karazhan",
    description: "Conquistou o 2 lugar no ranking da Season 1 de Karazhan.",
    icon: "/medalhas/2kara.png",
  },
  {
    name: "Top 3 Season 1 Karazhan",
    description: "Conquistou o 3 lugar no ranking da Season 1 de Karazhan.",
    icon: "/medalhas/3kara.png",
  },
  {
    name: "Top 1 Season 1 Gruull/Mag",
    description: "Conquistou o 1 lugar no ranking da Season 1 de Gruull/Mag.",
    icon: "/medalhas/1mag.png",
  },
  {
    name: "Top 2 Season 1 Gruull/Mag",
    description: "Conquistou o 2 lugar no ranking da Season 1 de Gruull/Mag.",
    icon: "/medalhas/2mag.png",
  },
  {
    name: "Top 3 Season 1 Gruull/Mag",
    description: "Conquistou o 3 lugar no ranking da Season 1 de Gruull/Mag.",
    icon: "/medalhas/3mag.png",
  },
  {
    name: "Entre os 5 melhores Gruul/Mag",
    description: "Terminou entre os 5 melhores membros em Gruul/Mag na Season 1.",
    icon: "/medalhas/1mag.png",
  },
  {
    name: "Entre os 5 melhores Karazhan",
    description: "Terminou entre os 5 melhores membros em Karazhan na Season 1.",
    icon: "/medalhas/1kara.png",
  },
];

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

export async function GET(request: NextRequest) {
  const authResult = await ensureFounder(request);

  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const snapshot = await adminDb
      .collection("trophies")
      .where("game", "==", "wow-tbc")
      .get();

    const trophies = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data();

        return {
          id: docSnap.id,
          name: data.name || "Sem nome",
          description: data.description || "",
          icon: data.icon || "🏆",
          game: data.game || "wow-tbc",
        };
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
      );

    return NextResponse.json(trophies);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Failed to fetch trophies",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await ensureFounder(request);

  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const body = (await request.json()) as TrophyPayload & { seedDefaults?: boolean };

    if (body.seedDefaults) {
      const existingSnapshot = await adminDb
        .collection("trophies")
        .where("game", "==", "wow-tbc")
        .get();

      const existingNames = new Set(
        existingSnapshot.docs.map((docSnap) => String(docSnap.data().name || ""))
      );

      const writes = DEFAULT_WOW_TBC_TROPHIES.filter(
        (trophy) => !existingNames.has(trophy.name)
      ).map((trophy) =>
        adminDb.collection("trophies").add({
          ...trophy,
          game: "wow-tbc",
          createdAt: FieldValue.serverTimestamp(),
          createdBy: authResult.decodedToken.uid,
        })
      );

      await Promise.all(writes);

      return NextResponse.json({
        success: true,
        created: writes.length,
      });
    }

    const name = body.name?.trim();
    const description = body.description?.trim();
    const icon = body.icon?.trim() || "🏆";

    if (!name || !description) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 }
      );
    }

    const duplicateSnapshot = await adminDb
      .collection("trophies")
      .where("game", "==", "wow-tbc")
      .where("name", "==", name)
      .get();

    if (!duplicateSnapshot.empty) {
      return NextResponse.json(
        { error: "A trophy with this name already exists" },
        { status: 409 }
      );
    }

    const docRef = await adminDb.collection("trophies").add({
      name,
      description,
      icon,
      game: "wow-tbc",
      createdAt: FieldValue.serverTimestamp(),
      createdBy: authResult.decodedToken.uid,
    });

    return NextResponse.json({
      success: true,
      trophy: {
        id: docRef.id,
        name,
        description,
        icon,
        game: "wow-tbc",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Failed to create trophies",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
