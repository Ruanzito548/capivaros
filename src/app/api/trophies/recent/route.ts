import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

interface TrophyEntry {
  username: string;
  photoURL: string;
  trophy: {
    id?: string;
    name: string;
    description: string;
    icon?: string;
    points?: number;
    rarity?: string;
    awardedAt?: number | null;
  };
}

export async function GET() {
  try {
    const snapshot = await adminDb.collection("users").get();

    const entries: TrophyEntry[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const trophies = Array.isArray(data.trophies?.["wow-tbc"])
        ? data.trophies["wow-tbc"]
        : [];

      for (const trophy of trophies) {
        if (!trophy?.name || !trophy?.description) {
          continue;
        }

        entries.push({
          username: data.username || "Usuario",
          photoURL:
            typeof data.photoURL === "string" && data.photoURL.trim() !== ""
              ? data.photoURL
              : "/capilogo.png",
          trophy: {
            id: trophy.id,
            name: trophy.name,
            description: trophy.description,
            icon: trophy.icon,
            points: typeof trophy.points === "number" ? trophy.points : 0,
            rarity: trophy.rarity || "Comum",
            awardedAt:
              typeof trophy.awardedAt === "number" ? trophy.awardedAt : null,
          },
        });
      }
    }

    entries.sort((a, b) => {
      const aDate = typeof a.trophy.awardedAt === "number" ? a.trophy.awardedAt : 0;
      const bDate = typeof b.trophy.awardedAt === "number" ? b.trophy.awardedAt : 0;
      return bDate - aDate;
    });

    return NextResponse.json(entries.slice(0, 30));
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Failed to fetch recent trophies",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
