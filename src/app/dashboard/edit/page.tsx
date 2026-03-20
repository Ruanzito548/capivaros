"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function EditProfile() {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [coverURL, setCoverURL] = useState("");

  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push("/login");
        return;
      }

      const snap = await getDoc(doc(db, "users", u.uid));
      const data = snap.data();

      if (!data) return;

      setUsername(data.username || "");
      setPhotoURL(data.photoURL || "");
      setCoverURL(data.coverURL || "");
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  const handleSave = async () => {
    if (!auth.currentUser) return;

    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      username,
      photoURL,
      coverURL,
    });

    alert("Perfil atualizado com sucesso!");
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] text-red-500 flex items-center justify-center">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white py-20 px-6">

      <h1 className="text-4xl font-bold text-center text-red-500 mb-12 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">
        Editar Perfil
      </h1>

      <div className="max-w-2xl mx-auto bg-[#141414] border border-red-900 rounded-2xl p-10 shadow-[0_0_20px_rgba(255,0,0,0.2)]">

        {/* Username */}
        <div className="mb-6">
          <label className="block mb-2 text-red-400 font-semibold">
            Nome de Usuário
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-3 bg-[#1c1c1c] border border-red-900 rounded-lg focus:outline-none focus:border-red-600"
          />
        </div>

        {/* Avatar URL */}
        <div className="mb-6">
          <label className="block mb-2 text-red-400 font-semibold">
            URL da Foto de Perfil
          </label>
          <input
            type="text"
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            className="w-full p-3 bg-[#1c1c1c] border border-red-900 rounded-lg focus:outline-none focus:border-red-600"
          />
        </div>

        {/* Cover URL */}
        <div className="mb-8">
          <label className="block mb-2 text-red-400 font-semibold">
            URL da Foto de Capa
          </label>
          <input
            type="text"
            value={coverURL}
            onChange={(e) => setCoverURL(e.target.value)}
            className="w-full p-3 bg-[#1c1c1c] border border-red-900 rounded-lg focus:outline-none focus:border-red-600"
          />
        </div>

        {/* Botões */}
        <div className="flex justify-between">

          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-400 hover:text-white transition"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg shadow-[0_0_10px_rgba(255,0,0,0.6)] transition"
          >
            Salvar Alterações
          </button>

        </div>

      </div>

    </div>
  );
}