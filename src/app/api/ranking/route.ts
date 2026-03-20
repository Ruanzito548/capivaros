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

    // 🔥 Junta todas as promises pra rodar em paralelo (MUITO mais rápido)
    const promises: Promise<any>[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();

      if (!Array.isArray(user.characters)) continue;

      for (const char of user.characters) {
        const url = `https://capivaros.vercel.app/api/logs?name=${char.name}&server=${char.server}&region=US&zone=${zone}`;

        const promise = fetch(url)
          .then(async (res) => {
            if (!res.ok) return null;

            const data = await res.json();
            const percent = data?.percent;

            if (typeof percent === "number" && percent > 0) {
              return {
                username: user.username,
                character: data.name,
                percent,
              };
            }

            return null;
          })
          .catch(() => null);

        promises.push(promise);
      }
    }

    // 🔥 Executa tudo junto
    const results = await Promise.all(promises);

    const ranking = results
      .filter((r) => r !== null)
      .sort((a, b) => b.percent - a.percent)
      .slice(0, limit);

    return NextResponse.json(ranking);
  } catch (error) {
    return NextResponse.json(
      { error: "Ranking generation failed", details: error },
      { status: 500 }
    );
  }
}