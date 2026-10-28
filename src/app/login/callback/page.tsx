"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getSafeNextPath } from "@/lib/safe-next-path";

export default function DiscordLoginCallback() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    const next = getSafeNextPath(new URLSearchParams(window.location.search).get("next"));

    // Remove o token do endereco para nao ficar no historico do navegador.
    window.history.replaceState(null, "", window.location.pathname);

    if (!token) {
      router.replace("/login?error=state");
      return;
    }

    signInWithCustomToken(auth, token)
      .then(async ({ user }) => {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        const hasProfile = Boolean(snapshot.data()?.username);

        router.replace(hasProfile ? next || "/dashboard" : "/complete-profile");
      })
      .catch((error) => {
        console.error("Erro ao concluir login com Discord:", error);
        setFailed(true);
      });
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 text-center text-white">
      {failed ? (
        <p role="alert" className="text-red-300">
          Nao foi possivel concluir o login.{" "}
          <a href="/login" className="underline">
            Tentar novamente
          </a>
        </p>
      ) : (
        <p className="text-red-400">Entrando com Discord...</p>
      )}
    </div>
  );
}
