"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getSafeNextPath } from "@/lib/safe-next-path";

const ERROR_MESSAGES: Record<string, string> = {
  cancelled: "Login cancelado no Discord.",
  state: "A sessao de login expirou. Tente novamente.",
  config: "O login com Discord ainda nao esta configurado. Avise um administrador.",
  token: "O Discord recusou o login. Tente novamente.",
  profile: "Nao foi possivel ler seu perfil do Discord. Tente novamente.",
  server: "Nao foi possivel entrar agora. Tente novamente.",
};

export default function Login() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const next = getSafeNextPath(searchParams.get("next"));
  const errorKey = searchParams.get("error");
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] ?? ERROR_MESSAGES.server : null;
  const loginHref = next
    ? `/api/auth/discord?next=${encodeURIComponent(next)}`
    : "/api/auth/discord";

  return (
    <div className="min-h-screen bg-transparent text-white px-6 py-16">
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
              Use sua conta do Discord para entrar com seguranca, completar seu
              perfil e acompanhar tudo da guilda em um unico lugar.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-red-900/60 bg-[#111]/80 p-5">
                <p className="text-sm font-semibold text-red-400">
                  1. Login rapido
                </p>
                <p className="mt-2 text-sm text-gray-400">
                  Entre com Discord em poucos segundos.
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

                {errorMessage && (
                  <p role="alert" className="mt-6 rounded-xl border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                    {errorMessage}
                  </p>
                )}

                <a
                  href={loginHref}
                  className="mt-8 flex w-full items-center justify-center rounded-xl bg-[#5865F2] px-6 py-3 font-semibold text-white transition hover:bg-[#4752c4]"
                >
                  Entrar com Discord
                </a>

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
