"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { canAccessWowAdmin, canManageRoles } from "@/lib/permissions";

export default function AdminWOWTBC() {
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

        if (!canAccessWowAdmin(data.role)) {
          router.push("/");
          return;
        }

        setRole(data.role ?? null);
        setLoading(false);
      } catch (error) {
        console.error("ERRO ADMIN WOW TBC:", error);
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
        <div className="mb-14 text-center">
          <h1 className="text-5xl font-bold text-red-500 drop-shadow-[0_0_20px_rgba(255,0,0,0.8)]">
            World of Warcraft TBC
          </h1>

          <p className="text-gray-400 mt-4">
            Painel administrativo da guilda
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Link
            href="/admin/wow-tbc/aprovar-membros"
            className="group bg-[#111] border border-red-800 rounded-xl p-8 hover:border-red-500 hover:shadow-[0_0_35px_rgba(255,0,0,0.6)] transition"
          >
            <div className="text-4xl mb-4">👥</div>
            <h2 className="text-xl font-bold mb-2 group-hover:text-red-400">
              Aprovar Membros
            </h2>
            <p className="text-gray-400 text-sm">
              Revisar aplicacoes de entrada na guilda.
            </p>
          </Link>

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

          {canManageRoles(role) && (
            <Link
              href="/admin/wow-tbc/personagens"
              className="group bg-[#111] border border-red-800 rounded-xl p-8 hover:border-red-500 hover:shadow-[0_0_35px_rgba(255,0,0,0.6)] transition"
            >
              <div className="text-4xl mb-4">🗂️</div>
              <h2 className="text-xl font-bold mb-2 group-hover:text-red-400">
                Personagens Vinculados
              </h2>
              <p className="text-gray-400 text-sm">
                Ver quem possui cada personagem e excluir do Firebase.
              </p>
            </Link>
          )}

        </div>
      </div>
    </div>
  );
}
