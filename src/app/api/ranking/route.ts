import { NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

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
    const usersSnapshot = await getDocs(collection(db, "users"));
    const ranking: any[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();

      if (!Array.isArray(user.characters)) continue;

      for (const char of user.characters) {
        try {
          const res = await fetch(
            `http://localhost:3000/api/logs?name=${char.name}&server=${char.server}&region=US&zone=${zone}`
          );

          if (!res.ok) continue;

          const data = await res.json();

          // 🔥 AGORA compatível com a última versão da logs
          const percent = data?.percent;

          if (typeof percent === "number" && percent > 0) {
            ranking.push({
              username: user.username,
              character: data.name,
              percent,
            });
          }
        } catch {
          continue;
        }
      }
    }

    ranking.sort((a, b) => b.percent - a.percent);

    return NextResponse.json(ranking.slice(0, limit));
  } catch (error) {
    return NextResponse.json(
      { error: "Ranking generation failed", details: error },
      { status: 500 }
    );
  }
}