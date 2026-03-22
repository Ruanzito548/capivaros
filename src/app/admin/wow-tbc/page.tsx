"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { isAdmin } from "@/lib/permissions";

export default function AdminWOWTBC() {

  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {

    const unsub = onAuthStateChanged(auth, async (user) => {

      try {

        // ❌ não logado
        if (!user) {
          router.push("/");
          return;
        }

        // 🔍 busca usuário
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        // ❌ não existe no banco
        if (!snap.exists()) {
          console.warn("Usuário não encontrado no Firestore");
          router.push("/");
          return;
        }

        const data = snap.data();

        console.log("USER DATA:", data);

        // ❌ não é admin
        if (!isAdmin(data.role)) {
          console.warn("Usuário não é admin");
          router.push("/");
          return;
        }

        // ✅ liberado
        setLoading(false);

      } catch (error) {

        console.error("ERRO ADMIN WOW TBC:", error);

        // evita travar loading infinito
        router.push("/");
      }

    });

    return () => unsub();

  }, [router]);

  // 🔄 loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Verificando permissões...
      </div>
    );
  }

  // ✅ página liberada
  return (

    <div className="min-h-screen bg-[#0b0b0b] text-white px-6 py-16 flex justify-center">

      <div className="max-w-6xl w-full">

        {/* HEADER */}

        <div className="mb-14 text-center">

          <h1 className="text-5xl font-bold text-red-500 drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]">
            World of Warcraft TBC
          </h1>

          <p className="text-gray-400 mt-4">
            Painel administrativo da guilda
          </p>

        </div>

        {/* CARDS */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* APROVAR MEMBROS */}

          <Link
            href="/admin/wow-tbc/aprovar-membros"
            className="group bg-[#111] border border-red-800 rounded-xl p-8 hover:border-red-500 hover:shadow-[0_0_35px_rgba(255,0,0,0.6)] transition"
          >
            <div className="text-4xl mb-4">👥</div>

            <h2 className="text-xl font-bold mb-2 group-hover:text-red-400">
              Aprovar Membros
            </h2>

            <p className="text-gray-400 text-sm">
              Revisar aplicações de entrada na guilda.
            </p>
          </Link>

          {/* APROVAR PERSONAGENS */}

          <Link
            href="/admin/wow-tbc/aprovar-personagens"
            className="group bg-[#111] border border-red-800 rounded-xl p-8 hover:border-red-500 hover:shadow-[0_0_35px_rgba(255,0,0,0.6)] transition"
          >
            <div className="text-4xl mb-4">⚔️</div>

            <h2 className="text-xl font-bold mb-2 group-hover:text-red-400">
              Aprovar Personagens
            </h2>

            <p className="text-gray-400 text-sm">
              Validar personagens enviados pelos membros.
            </p>
          </Link>

          {/* RANKING FUTURO */}

          <div className="bg-[#111] border border-red-900 rounded-xl p-8 opacity-60">

            <div className="text-4xl mb-4">📊</div>

            <h2 className="text-xl font-bold mb-2">
              Ranking / Logs
            </h2>

            <p className="text-gray-400 text-sm">
              Em breve: ranking de parses e desempenho da raid.
            </p>

          </div>

        </div>

      </div>

    </div>

  );

}