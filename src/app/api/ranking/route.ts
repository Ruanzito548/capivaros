import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
const RANKING_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface RankingResult {
  username: string;
  character: string;
  percent: number;
  photoURL?: string;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const zone = searchParams.get("zone");
  const limitParam = searchParams.get("limit");

  if (!zone) {
    return NextResponse.json(
      { error: "Zone parameter is required" },
      { status: 400 }
    );
  }

  const limit = limitParam ? Number(limitParam) : 9999;

  try {
    const rankingCacheRef = adminDb.collection("rankingCache").doc(zone);

    try {
      const rankingCacheSnap = await rankingCacheRef.get();
      const rankingCacheData = rankingCacheSnap.data();

      if (
        rankingCacheData &&
        typeof rankingCacheData.fetchedAt === "number" &&
        Date.now() - rankingCacheData.fetchedAt < RANKING_CACHE_TTL_MS &&
        Array.isArray(rankingCacheData.entries) &&
        rankingCacheData.entries.length > 0 &&
        rankingCacheData.entries.every(
          (entry: RankingResult) =>
            typeof entry.photoURL === "string" && entry.photoURL.trim() !== ""
        )
      ) {
        return NextResponse.json(rankingCacheData.entries.slice(0, limit));
      }
    } catch (cacheError) {
      console.error("Ranking cache read failed:", cacheError);
    }

    const usersSnapshot = await adminDb.collection("users").get();

    if (!usersSnapshot || usersSnapshot.empty) {
      return NextResponse.json([]);
    }

    const promises: Promise<RankingResult | null>[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();

      if (!user || !Array.isArray(user.characters)) continue;

      for (const char of user.characters) {
        if (!char?.name || !char?.server) continue;

        const url =
          `${origin}/api/logs?name=${encodeURIComponent(char.name)}` +
          `&server=${encodeURIComponent(char.server)}` +
          `&region=US&zone=${encodeURIComponent(zone)}`;

        const promise = fetch(url, {
          signal: AbortSignal.timeout(8000),
        })
          .then(async (res) => {
            if (!res.ok) {
              return null;
            }

            const data = await res.json();
            const percent = data?.percent;

            if (typeof percent !== "number" || percent <= 0) {
              return null;
            }

            return {
              username: user.username || "Desconhecido",
              character: data.name || char.name,
              percent,
              photoURL:
                typeof user.photoURL === "string" && user.photoURL.trim() !== ""
                  ? user.photoURL
                  : "/capilogo.png",
            };
          })
          .catch(() => null);

        promises.push(promise);
      }
    }

    const results = await Promise.all(promises);

    const ranking = results
      .filter((entry): entry is RankingResult => entry !== null)
      .sort((a, b) => b.percent - a.percent);

    if (ranking.length > 0) {
      try {
        await rankingCacheRef.set({
          fetchedAt: Date.now(),
          entries: ranking,
        });
      } catch (cacheError) {
        console.error("Ranking cache write failed:", cacheError);
      }
    }

    return NextResponse.json(ranking.slice(0, limit));
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Ranking generation failed",
        message: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
