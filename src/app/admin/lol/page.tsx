"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { isAdmin } from "@/lib/permissions";

export default function AdminLOL() {

  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {

    const unsub = onAuthStateChanged(auth, async (user) => {

      if (!user) {
        router.push("/");
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));

      if (!snap.exists()) {
        router.push("/");
        return;
      }

      const data = snap.data();

      if (!isAdmin(data.role)) {
        router.push("/");
        return;
      }

      setLoading(false);

    });

    return () => unsub();

  }, []);

  if (loading) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Verificando permissões...
      </div>
    );

  }

  return (

    <div className="min-h-screen bg-[#0b0b0b] text-white px-6 py-16 flex justify-center">

      <div className="max-w-6xl w-full">

        {/* HEADER */}

        <div className="mb-12 text-center">

          <Link
            href="/admin"
            className="text-gray-400 hover:text-red-400 transition text-sm"
          >
            ← Voltar para Admin
          </Link>

          <h1 className="text-5xl font-bold text-red-500 mt-6 drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]">
            League of Legends
          </h1>

          <p className="text-gray-400 mt-4">
            Painel administrativo do time
          </p>

        </div>

        {/* CARDS */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* APROVAR MEMBROS */}

          <Link
            href="/admin/lol/aprovar-membros"
            className="group bg-[#111] border border-red-800 rounded-xl p-8 hover:border-red-500 hover:shadow-[0_0_35px_rgba(255,0,0,0.6)] transition"
          >

            <div className="text-4xl mb-4">👥</div>

            <h2 className="text-xl font-bold mb-2 group-hover:text-red-400">
              Aprovar Jogadores
            </h2>

            <p className="text-gray-400 text-sm">
              Revisar e aprovar aplicações de novos jogadores.
            </p>

          </Link>

          {/* RANKING FUTURO */}

          <div className="bg-[#111] border border-red-900 rounded-xl p-8 opacity-60">

            <div className="text-4xl mb-4">📊</div>

            <h2 className="text-xl font-bold mb-2">
              Ranking
            </h2>

            <p className="text-gray-400 text-sm">
              Em breve: ranking de jogadores.
            </p>

          </div>

          {/* ESTATÍSTICAS FUTURO */}

          <div className="bg-[#111] border border-red-900 rounded-xl p-8 opacity-60">

            <div className="text-4xl mb-4">🏆</div>

            <h2 className="text-xl font-bold mb-2">
              Estatísticas
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