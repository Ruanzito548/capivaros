"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { isAdmin } from "@/lib/permissions";

export default function AdminPage() {

  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {

    const unsub = onAuthStateChanged(auth, async (user) => {

      try {

        // ❌ não logado → manda embora
        if (!user) {
          router.push("/");
          return;
        }

        // 🔍 busca dados do usuário
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

        // ✅ passou tudo
        setLoading(false);

      } catch (error) {
        console.error("ERRO NA VERIFICAÇÃO:", error);

        // evita travar infinito
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

  // ✅ conteúdo liberado
  return (

    <div className="min-h-screen bg-[#0b0b0b] text-white px-6 py-16 flex justify-center">

      <div className="max-w-6xl w-full">

        <h1 className="text-5xl font-bold text-red-500 mb-14 text-center drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]">
          Painel Administrativo
        </h1>

        {/* ========================= */}
        {/* JOGOS */}
        {/* ========================= */}

        <h2 className="text-2xl text-red-400 mb-6">
          Jogos
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">

          <Link
            href="/admin/wow-tbc"
            className="group bg-[#111] border border-red-800 rounded-xl p-10 hover:border-red-500 hover:shadow-[0_0_40px_rgba(255,0,0,0.6)] transition"
          >
            <div className="text-5xl mb-6">🐉</div>

            <h2 className="text-2xl font-bold mb-3 group-hover:text-red-400">
              World of Warcraft TBC
            </h2>

            <p className="text-gray-400">
              Gerenciar membros, personagens e atividades da guilda.
            </p>
          </Link>

          <Link
            href="/admin/lol"
            className="group bg-[#111] border border-red-800 rounded-xl p-10 hover:border-red-500 hover:shadow-[0_0_40px_rgba(255,0,0,0.6)] transition"
          >
            <div className="text-5xl mb-6">⚔️</div>

            <h2 className="text-2xl font-bold mb-3 group-hover:text-red-400">
              League of Legends
            </h2>

            <p className="text-gray-400">
              Aprovar jogadores e gerenciar membros do time.
            </p>
          </Link>

        </div>

        {/* ========================= */}
        {/* ADMIN DO SITE */}
        {/* ========================= */}

        <h2 className="text-2xl text-red-400 mb-6">
          Administração do Site
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          <Link
            href="/admin/noticias"
            className="group bg-[#111] border border-red-800 rounded-xl p-8 hover:border-red-500 hover:shadow-[0_0_30px_rgba(255,0,0,0.5)] transition"
          >
            <div className="text-4xl mb-4">📰</div>

            <h2 className="text-xl font-bold mb-2 group-hover:text-red-400">
              Gerenciar Notícias
            </h2>

            <p className="text-gray-400 text-sm">
              Criar, editar e remover notícias da guilda
            </p>
          </Link>

          <Link
            href="/admin/gerenciar-cargos"
            className="group bg-[#111] border border-red-800 rounded-xl p-8 hover:border-red-500 hover:shadow-[0_0_30px_rgba(255,0,0,0.5)] transition"
          >
            <div className="text-4xl mb-4">🛡️</div>

            <h2 className="text-xl font-bold mb-2 group-hover:text-red-400">
              Gerenciar Cargos
            </h2>

            <p className="text-gray-400 text-sm">
              Alterar cargos dos membros da guilda
            </p>
          </Link>

        </div>

      </div>

    </div>

  );

}