"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    try {
      setLoading(true);

      const nextPath =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          name: user.displayName,
          email: user.email,
          role: "member",
          createdAt: new Date(),
        });

        router.push("/complete-profile");
        return;
      }

      const data = userSnap.data();

      if (!data.username || !data.phone) {
        router.push("/complete-profile");
      } else {
        router.push(nextPath || "/dashboard");
      }
    } catch (error) {
      console.error("Erro no login:", error);
      alert("Nao foi possivel entrar agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(140,0,0,0.25),transparent_35%),linear-gradient(180deg,#050505_0%,#0d0d0d_45%,#160000_100%)] text-white px-6 py-16">
      <div className="mx-auto flex min-h-[80vh] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl border border-red-900/70 bg-black/40 shadow-[0_0_45px_rgba(255,0,0,0.12)] backdrop-blur md:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-red-900/50 p-10 md:border-b-0 md:border-r">
            <p className="mb-4 text-sm uppercase tracking-[0.35em] text-red-500">
              Capivaros Templarios
            </p>

            <h1 className="max-w-md text-4xl font-bold leading-tight text-white md:text-5xl">
              Entre para acessar o painel da guilda
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-gray-300">
              Use sua conta Google para entrar com seguranca, completar seu
              perfil e acompanhar tudo da guilda em um unico lugar.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-red-900/60 bg-[#111]/80 p-5">
                <p className="text-sm font-semibold text-red-400">
                  1. Login rapido
                </p>
                <p className="mt-2 text-sm text-gray-400">
                  Entre com Google em poucos segundos.
                </p>
              </div>

              <div className="rounded-2xl border border-red-900/60 bg-[#111]/80 p-5">
                <p className="text-sm font-semibold text-red-400">
                  2. Complete o perfil
                </p>
                <p className="mt-2 text-sm text-gray-400">
                  Defina username, discord e dados basicos.
                </p>
              </div>

              <div className="rounded-2xl border border-red-900/60 bg-[#111]/80 p-5">
                <p className="text-sm font-semibold text-red-400">
                  3. Acesse o painel
                </p>
                <p className="mt-2 text-sm text-gray-400">
                  Veja noticias, guilda e recursos disponiveis.
                </p>
              </div>
            </div>
          </div>

          <div className="p-10">
            <div className="mx-auto max-w-md">
              <div className="rounded-3xl border border-red-900/60 bg-[#0d0d0d]/90 p-8 shadow-[0_0_25px_rgba(255,0,0,0.12)]">
                <h2 className="text-2xl font-bold text-red-500">
                  Entrar
                </h2>

                <p className="mt-3 text-sm leading-6 text-gray-400">
                  Se for seu primeiro acesso, voce sera redirecionado para
                  completar o perfil antes de entrar no dashboard.
                </p>

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="mt-8 flex w-full items-center justify-center rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Entrando..." : "Entrar com Google"}
                </button>

                <div className="mt-8 rounded-2xl border border-red-900/50 bg-[#111]/70 p-5">
                  <p className="text-sm font-semibold text-red-400">
                    O que voce vai encontrar
                  </p>

                  <ul className="mt-3 space-y-2 text-sm text-gray-400">
                    <li>Noticias e atualizacoes da guilda</li>
                    <li>Painel com recursos por jogo</li>
                    <li>Solicitacao e gerenciamento de personagens</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
