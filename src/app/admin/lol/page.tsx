"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { canAccessLolAdmin } from "@/lib/permissions";

export default function AdminLOL() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          router.push("/");
          return;
        }

        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          router.push("/");
          return;
        }

        const data = snap.data();

        if (!canAccessLolAdmin(data.role)) {
          router.push("/");
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error("ERRO ADMIN LOL:", error);
        router.push("/");
      }
    });

    return () => unsub();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Verificando permissoes...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white px-6 py-16 flex justify-center">
      <div className="max-w-6xl w-full">
        <div className="mb-12 text-center">
          <Link
            href="/admin"
            className="text-gray-400 hover:text-red-400 transition text-sm"
          >
            Voltar para Admin
          </Link>

          <h1 className="text-5xl font-bold text-red-500 mt-6 drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]">
            League of Legends
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Link
            href="/admin/lol/aprovar-membros"
            className="group bg-[#111] border border-red-800 rounded-xl p-8 hover:border-red-500 hover:shadow-[0_0_35px_rgba(255,0,0,0.6)] transition"
          >
            <div className="text-4xl mb-4">👥</div>
            <h2 className="text-xl font-bold mb-2 group-hover:text-red-400">
              Aprovar Jogadores
            </h2>
            <p className="text-gray-400 text-sm">
              Revisar e aprovar aplicacoes de novos jogadores.
            </p>
          </Link>

          <div className="bg-[#111] border border-red-900 rounded-xl p-8 opacity-60">
            <div className="text-4xl mb-4">📊</div>

            <h2 className="text-xl font-bold mb-2">
              Ranking
            </h2>

            <p className="text-gray-400 text-sm">
              Em breve: ranking de jogadores.
            </p>
          </div>

          <div className="bg-[#111] border border-red-900 rounded-xl p-8 opacity-60">
            <div className="text-4xl mb-4">🏆</div>

            <h2 className="text-xl font-bold mb-2">
              Estatisticas
            </h2>

            <p className="text-gray-400 text-sm">
              Em breve: dados e desempenho do time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
