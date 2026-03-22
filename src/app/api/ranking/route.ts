import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

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

    console.log("🔍 Buscando usuários...");

    const usersSnapshot = await adminDb.collection("users").get();

    if (!usersSnapshot || usersSnapshot.empty) {
      console.warn("⚠️ Nenhum usuário encontrado");
      return NextResponse.json([]);
    }

    const promises: Promise<any>[] = [];

    for (const userDoc of usersSnapshot.docs) {

      const user = userDoc.data();

      if (!user || !Array.isArray(user.characters)) continue;

      for (const char of user.characters) {

        if (!char?.name || !char?.server) continue;

        const url = `https://capivaros.vercel.app/api/logs?name=${char.name}&server=${char.server}&region=US&zone=${zone}`;

        const promise = fetch(url, {
          // 🔥 evita travar se API demorar
          signal: AbortSignal.timeout(8000),
        })
          .then(async (res) => {

            if (!res.ok) {
              console.warn("❌ API logs falhou:", char.name, res.status);
              return null;
            }

            const data = await res.json();

            if (!data) return null;

            const percent = data?.percent;

            if (typeof percent === "number" && percent > 0) {
              return {
                username: user.username || "Desconhecido",
                character: data.name || char.name,
                percent,
              };
            }

            return null;

          })
          .catch((err) => {
            console.error("💥 Erro fetch:", char.name, err.message);
            return null;
          });

        promises.push(promise);

      }

    }

    console.log("⚡ Executando requests:", promises.length);

    const results = await Promise.all(promises);

    const ranking = results
      .filter((r) => r !== null)
      .sort((a, b) => b.percent - a.percent)
      .slice(0, limit);

    console.log("✅ Ranking gerado:", ranking.length);

    return NextResponse.json(ranking);

  } catch (error: any) {

    console.error("💥 ERRO GERAL RANKING:", error);

    return NextResponse.json(
      {
        error: "Ranking generation failed",
        message: error?.message || "Erro desconhecido",
      },
      { status: 500 }
    );

  }

}
