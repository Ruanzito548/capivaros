"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";

import {
  canAccessLolAdmin,
  canAccessWowAdmin,
  canCreateNews,
  canManageRoles,
  isAdmin,
} from "@/lib/permissions";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
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

        if (!isAdmin(data.role)) {
          router.push("/");
          return;
        }

        setRole(data.role ?? null);
        setLoading(false);
      } catch (error) {
        console.error("ERRO NA VERIFICACAO:", error);
        router.push("/");
      }
    });

    return () => unsub();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent text-white">
        Verificando permissoes...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white px-6 py-16 flex justify-center">
      <div className="max-w-6xl w-full">
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-8 text-sm text-gray-400 transition hover:text-red-400"
        >
          Voltar para o Dashboard
        </button>

        <h1 className="text-5xl font-bold text-red-500 mb-14 text-center drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]">
          Painel Administrativo
        </h1>

        <h2 className="text-2xl text-red-400 mb-6">
          Jogos
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {canAccessWowAdmin(role) && (
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
          )}

          {canAccessLolAdmin(role) && (
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
          )}
        </div>

        <h2 className="text-2xl text-red-400 mb-6">
          Administracao do Site
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {canCreateNews(role) && (
            <Link
              href="/admin/noticias"
              className="group bg-[#111] border border-red-800 rounded-xl p-8 hover:border-red-500 hover:shadow-[0_0_30px_rgba(255,0,0,0.5)] transition"
            >
              <div className="text-4xl mb-4">📰</div>

              <h2 className="text-xl font-bold mb-2 group-hover:text-red-400">
                Gerenciar Noticias
              </h2>

              <p className="text-gray-400 text-sm">
                Criar, editar e remover noticias da guilda.
              </p>
            </Link>
          )}

          {canManageRoles(role) && (
            <Link
              href="/admin/gerenciar-cargos"
              className="group bg-[#111] border border-red-800 rounded-xl p-8 hover:border-red-500 hover:shadow-[0_0_30px_rgba(255,0,0,0.5)] transition"
            >
              <div className="text-4xl mb-4">🛡️</div>

              <h2 className="text-xl font-bold mb-2 group-hover:text-red-400">
                Gerenciar Cargos
              </h2>

              <p className="text-gray-400 text-sm">
                Alterar cargos dos membros da guilda.
              </p>
            </Link>
          )}

          {canManageRoles(role) && (
            <Link
              href="/admin/membros"
              className="group bg-[#111] border border-red-800 rounded-xl p-8 hover:border-red-500 hover:shadow-[0_0_30px_rgba(255,0,0,0.5)] transition"
            >
              <div className="text-4xl mb-4">👤</div>

              <h2 className="text-xl font-bold mb-2 group-hover:text-red-400">
                Todos os Membros
              </h2>

              <p className="text-gray-400 text-sm">
                Ver todas as contas do Firebase e excluir quando necessario.
              </p>
            </Link>
          )}

          {canManageRoles(role) && (
            <Link
              href="/admin/discord-bot"
              className="group bg-[#111] border border-red-800 rounded-xl p-8 hover:border-red-500 hover:shadow-[0_0_30px_rgba(255,0,0,0.5)] transition"
            >
              <div className="text-4xl mb-4">🤖</div>

              <h2 className="text-xl font-bold mb-2 group-hover:text-red-400">
                Controle do Bot Discord
              </h2>

              <p className="text-gray-400 text-sm">
                Configurar servidor, canais e operacoes administrativas do bot.
              </p>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
