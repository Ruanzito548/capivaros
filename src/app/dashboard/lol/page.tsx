"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";

export default function DashboardLOL() {

  const [userData, setUserData] = useState<any>(null);
  const [riotId, setRiotId] = useState<string | null>(null);
  const [trophies, setTrophies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {

    const unsub = onAuthStateChanged(auth, async (u) => {

      if (!u) {
        router.push("/login");
        return;
      }

      const ref = doc(db, "users", u.uid);
      const snap = await getDoc(ref);
      const data = snap.data();

      if (!data) {
        router.push("/dashboard");
        return;
      }

      const riot = data.applications?.["lol"]?.riotId || null;
      const userTrophies = data.trophies?.["lol"] || [];

      setUserData({
        ...data,
        photoURL: data.photoURL || "/capilogo.png",
        coverURL: data.coverURL,
      });

      setRiotId(riot);
      setTrophies(userTrophies);

      setLoading(false);

    });

    return () => unsub();

  }, [router]);

  if (loading) {

    return (
      <div className="min-h-screen bg-black text-red-500 flex items-center justify-center">
        Carregando...
      </div>
    );

  }

  const opggLink = riotId
    ? `https://www.op.gg/summoners/br/${riotId.replace("#", "-")}`
    : null;

  return (

    <div className="min-h-screen bg-gradient-to-b from-[#0b0b0b] to-[#120000] text-white">

      {/* CAPA */}

      <div className="relative h-[350px] w-full overflow-hidden">

        <img
          src={userData.coverURL || "/capa.jpg"}
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-black/60" />

      </div>

      <div className="max-w-6xl mx-auto px-6">

        {/* PERFIL */}

        <div className="relative -mt-24 flex flex-col items-center">

          <div className="w-[160px] h-[160px] rounded-full border-4 border-red-600 overflow-hidden shadow-[0_0_30px_rgba(255,0,0,0.7)]">

            <img
              src={userData.photoURL}
              className="w-full h-full object-cover"
            />

          </div>

          <h1 className="text-5xl font-bold mt-6 text-red-500 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">
            {userData.username}
          </h1>

          <span className="mt-4 px-8 py-2 rounded-full text-sm bg-zinc-700">
            {userData.role}
          </span>

        </div>

        {/* PAINEL */}

        <div className="mt-20 grid md:grid-cols-2 gap-10">

          {/* OP.GG */}

          {opggLink && (

            <a
              href={opggLink}
              target="_blank"
              className="bg-[#141414] border border-red-900 rounded-2xl p-8 text-left hover:bg-red-900/40 transition shadow-[0_0_20px_rgba(255,0,0,0.25)] hover:shadow-[0_0_35px_rgba(255,0,0,0.6)]"
            >

              <h3 className="text-2xl font-bold text-red-400 mb-4">
                OP.GG
              </h3>

              <p className="text-gray-400">
                Ver estatísticas, ranking e histórico de partidas.
              </p>

            </a>

          )}

          {/* TROFÉUS */}

          <button
            onClick={() => router.push("/dashboard/lol/trofeus")}
            className="bg-[#141414] border border-red-900 rounded-2xl p-8 text-left hover:bg-red-900/40 transition shadow-[0_0_20px_rgba(255,0,0,0.25)] hover:shadow-[0_0_35px_rgba(255,0,0,0.6)]"
          >

            <h3 className="text-2xl font-bold text-red-400 mb-4">
              Troféus
            </h3>

            <p className="text-gray-400">
              Visualize suas conquistas no League of Legends.
            </p>

            <div className="mt-4 text-yellow-400 text-sm">
              {trophies.length} troféus desbloqueados
            </div>

          </button>

        </div>

        {/* PREVIEW TROFÉUS */}

        {trophies.length > 0 && (

          <div className="mt-20">

            <h2 className="text-3xl text-red-400 mb-6 text-center">
              Troféus do LoL
            </h2>

            <div className="grid md:grid-cols-4 gap-6">

              {trophies.map((trophy, index) => (

                <div
                  key={index}
                  className="bg-[#111] border border-red-900 p-6 rounded-xl text-center shadow-[0_0_10px_rgba(255,0,0,0.2)]"
                >

                  <div className="text-4xl mb-3">
                    {trophy.icon || "🏆"}
                  </div>

                  <p className="font-semibold text-red-400">
                    {trophy.name}
                  </p>

                  <p className="text-gray-500 text-sm mt-2">
                    {trophy.description}
                  </p>

                </div>

              ))}

            </div>

          </div>

        )}

        {/* VOLTAR */}

        <div className="mt-20 text-center pb-20">

          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-gray-400 hover:text-red-500 underline"
          >
            Voltar para Dashboard
          </button>

        </div>

      </div>

    </div>

  );

}
