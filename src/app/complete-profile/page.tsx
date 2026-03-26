"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function CompleteProfile() {
  const [username, setUsername] = useState("");
  const [discord, setDiscord] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  const handleUsernameChange = (value: string) => {
    setUsername(value.replace(/[^a-zA-Z0-9]/g, ""));
  };

  const handleDiscordChange = (value: string) => {
    setDiscord(value.replace(/\s+/g, ""));
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value.replace(/\s+/g, ""));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        if (snap.exists() && snap.data().username) {
          router.push("/dashboard");
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro ao verificar perfil:", error);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return;

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          discord,
          phone,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Erro ao salvar perfil.");
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Erro ao completar perfil:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Erro ao salvar perfil. Tente novamente."
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent text-white">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="bg-[#111] border border-red-800 rounded-2xl p-10 shadow-[0_0_40px_rgba(255,0,0,0.25)]">
          <h1 className="text-3xl font-bold text-red-500 text-center mb-6 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">
            Complete seu Perfil
          </h1>

          <p className="text-gray-400 text-center mb-8 text-sm">
            Antes de acessar o painel da guilda, precisamos de algumas
            informacoes basicas.
          </p>

          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Nome de usuario no site"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              className="w-full mb-4 p-3 bg-[#1c1c1c] border border-red-900 rounded-lg"
              pattern="[A-Za-z0-9]+"
              required
            />

            <input
              type="text"
              placeholder="Discord (ex: Ruanzito#1234)"
              value={discord}
              onChange={(e) => handleDiscordChange(e.target.value)}
              className="w-full mb-4 p-3 bg-[#1c1c1c] border border-red-900 rounded-lg"
              required
            />

            <input
              type="tel"
              placeholder="Telefone (opcional)"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="w-full mb-6 p-3 bg-[#1c1c1c] border border-red-900 rounded-lg"
            />

            <button className="w-full bg-red-600 hover:bg-red-700 p-3 rounded-lg font-semibold transition shadow-[0_0_15px_rgba(255,0,0,0.6)]">
              Salvar Perfil
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
