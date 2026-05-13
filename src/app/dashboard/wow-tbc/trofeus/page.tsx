"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { getGameTrophies, Trophy } from "@/lib/trophies";

export default function TrofeusPage() {
  const [trophies, setTrophies] = useState<Trophy[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));
      const data = snap.data();

      if (!data) {
        router.push("/dashboard");
        return;
      }

      setTrophies(getGameTrophies(data.trophies, "wow-tbc"));
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent px-6 py-16 text-red-500">
        Carregando trofeus...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-red-900/40 bg-black/20 p-10 text-center shadow-[0_0_35px_rgba(255,0,0,0.08)] backdrop-blur-sm">
          <div className="mb-6 text-6xl text-red-500/70">
            Trofeus
          </div>

          <h1 className="text-5xl font-bold tracking-wide text-white/90">
            WoW TBC
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-300/80">
            Seus trofeus salvos no perfil da guilda aparecem aqui.
          </p>
        </div>

        {trophies.length > 0 ? (
          <div className="mt-10 grid gap-6 md:grid-cols-4">
            {trophies.map((trophy, index) => (
              <div
                key={`${trophy.name}-${index}`}
                className="rounded-xl border border-red-900 bg-[#111] p-6 text-center shadow-[0_0_10px_rgba(255,0,0,0.2)]"
              >
                <div className="mb-3 text-4xl">
                  {trophy.icon || "🏆"}
                </div>

                <p className="font-semibold text-red-400">
                  {trophy.name}
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  {trophy.description}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-red-900/30 bg-[#111]/80 p-8 text-center text-gray-400">
            Voce ainda nao possui trofeus cadastrados.
          </div>
        )}
      </div>
    </div>
  );
}
