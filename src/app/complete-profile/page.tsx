"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";

import {
  doc,
  setDoc,
  getDoc
} from "firebase/firestore";

import {
  onAuthStateChanged
} from "firebase/auth";

import { useRouter } from "next/navigation";

export default function CompleteProfile() {

  const [username, setUsername] = useState("");
  const [discord, setDiscord] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  // 🔒 BLOQUEIO DE ACESSO
  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, async (user) => {

      if (!user) {
        router.push("/login");
        return;
      }

      try {

        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        // 🔥 Se já tem perfil → manda pro dashboard
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

  // 🔄 LOADING
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Carregando...
      </div>
    );
  }

  // 📝 SUBMIT
  const handleSubmit = async (e: any) => {

    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return;

    try {

      const ref = doc(db, "users", user.uid);

      await setDoc(ref, {
        username,
        discord,
        phone,

        role: "visitor",
        games: [],
        profileCompleted: true, // 🔥 importante

        createdAt: new Date()
      });

      router.push("/dashboard");

    } catch (error) {

      console.error("Erro ao completar perfil:", error);
      alert("Erro ao salvar perfil. Tente novamente.");

    }

  };

  return (

    <div className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center px-6">

      <div className="w-full max-w-md">

        <div className="bg-[#111] border border-red-800 rounded-2xl p-10 shadow-[0_0_40px_rgba(255,0,0,0.25)]">

          <h1 className="text-3xl font-bold text-red-500 text-center mb-6 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">
            Complete seu Perfil
          </h1>

          <p className="text-gray-400 text-center mb-8 text-sm">
            Antes de acessar o painel da guilda, precisamos de algumas informações básicas.
          </p>

          <form onSubmit={handleSubmit}>

            <input
              type="text"
              placeholder="Nome de usuário no site"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full mb-4 p-3 bg-[#1c1c1c] border border-red-900 rounded-lg"
              required
            />

            <input
              type="text"
              placeholder="Discord (ex: Ruanzito#1234)"
              value={discord}
              onChange={(e) => setDiscord(e.target.value)}
              className="w-full mb-4 p-3 bg-[#1c1c1c] border border-red-900 rounded-lg"
              required
            />

            <input
              type="tel"
              placeholder="Telefone (opcional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full mb-6 p-3 bg-[#1c1c1c] border border-red-900 rounded-lg"
            />

            <button
              className="w-full bg-red-600 hover:bg-red-700 p-3 rounded-lg font-semibold transition shadow-[0_0_15px_rgba(255,0,0,0.6)]"
            >
              Salvar Perfil
            </button>

          </form>

        </div>

      </div>

    </div>

  );

}