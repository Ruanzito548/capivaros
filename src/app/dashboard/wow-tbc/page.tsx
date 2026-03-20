"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, addDoc, collection } from "firebase/firestore";

export default function DashboardWOWTBC() {

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mainCharacter, setMainCharacter] = useState("");

  const router = useRouter();

  useEffect(() => {

    const unsub = onAuthStateChanged(auth, async (u) => {

      if (!u) {
        router.push("/login");
        return;
      }

      const ref = doc(db, "users", u.uid);
      const snap = await getDoc(ref);
      const data = snap.data();

      if (!data) {
        router.push("/dashboard");
        return;
      }

      setUserData({
        ...data,
        photoURL: data.photoURL || "/capilogo.png",
        coverURL: data.coverURL,
      });

      setLoading(false);

    });

    return () => unsub();

  }, [router]);

  const handleApply = async () => {

    if (!mainCharacter.trim() || !userData) return;

    const name = mainCharacter.trim();

    // Update user applications
    const applications = userData.applications || {};
    applications["wow-tbc"] = { mainCharacter: name };

    await updateDoc(doc(db, "users", userData.uid), {
      applications: applications
    });

    // Add character request
    await addDoc(collection(db, "characterRequests"), {
      username: userData.username,
      userId: userData.uid,
      name: name,
      server: "nightslayer",
      region: "US",
      status: "pending",
      createdAt: new Date()
    });

    alert("Aplicação enviada! Seu personagem principal foi solicitado para aprovação.");

    setMainCharacter("");

    // Refresh userData
    const snap = await getDoc(doc(db, "users", userData.uid));
    const data = snap.data();
    setUserData({
      ...data,
      photoURL: data?.photoURL || "/capilogo.png",
      coverURL: data?.coverURL || "https://arquivos.d21746a346ccb869dad3e9e44d4de611.r2.cloudflarestorage.com/templarios-desktop.jpg",
    });

  };

  if (loading) {

    return (
      <div className="min-h-screen bg-black text-red-500 flex items-center justify-center">
        Carregando...
      </div>
    );

  }

  return (

    <div className="min-h-screen bg-gradient-to-b from-[#0b0b0b] to-[#120000] text-white">

      {/* CAPA */}

      <div className="relative h-[350px] w-full overflow-hidden">

        <img
          src={userData.coverURL || "/capa.jpg"}
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-black/60" />

      </div>

      <div className="max-w-6xl mx-auto px-6">

        {/* PERFIL */}

        <div className="relative -mt-24 flex flex-col items-center">

          <div className="w-[160px] h-[160px] rounded-full border-4 border-red-600 overflow-hidden shadow-[0_0_30px_rgba(255,0,0,0.7)]">

            <img
              src={userData.photoURL}
              className="w-full h-full object-cover"
            />

          </div>

          <h1 className="text-5xl font-bold mt-6 text-red-500 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">
            {userData.username}
          </h1>

          <span className="mt-4 px-8 py-2 rounded-full text-sm bg-zinc-700">
            {userData.role}
          </span>

        </div>

        {/* APLICAÇÃO SE VISITOR */}

        {userData.role === "visitor" && (

          <div className="mt-20 bg-[#141414] border border-yellow-600 rounded-2xl p-8 max-w-2xl mx-auto">

            <h2 className="text-3xl font-bold text-yellow-400 mb-6 text-center">
              Aplicar para WoW TBC
            </h2>

            <p className="text-gray-400 mb-6 text-center">
              Insira o nome do seu personagem principal para solicitar entrada na guilda.
            </p>

            <div className="flex gap-4">

              <input
                type="text"
                placeholder="Nome do Personagem Principal"
                value={mainCharacter}
                onChange={(e) => setMainCharacter(e.target.value)}
                className="flex-1 p-3 bg-[#1c1c1c] border border-yellow-600 rounded-lg"
              />

              <button
                onClick={handleApply}
                className="bg-yellow-600 hover:bg-yellow-700 px-6 py-3 rounded-lg"
              >
                Solicitar
              </button>

            </div>

          </div>

        )}

        {/* PAINEL WOW */}

        <div className="mt-20 grid md:grid-cols-2 gap-10">

          <ActionCard
            title="Personagens"
            description="Gerencie seus personagens cadastrados."
            onClick={() => router.push("/dashboard/wow-tbc/characters")}
          />

          <ActionCard
            title="Troféus"
            description="Acompanhe suas conquistas."
            onClick={() => router.push("/dashboard/wow-tbc/trofeus")}
          />

        </div>

        {/* VOLTAR */}

        <div className="mt-16 text-center pb-20">

          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-gray-400 hover:text-red-500 underline"
          >
            Voltar para Dashboard
          </button>

        </div>

      </div>

    </div>

  );

}

/* CARD */

function ActionCard({ title, description, onClick }: any) {

  return (

    <button
      onClick={onClick}
      className="bg-[#141414] border border-red-900 rounded-2xl p-8 text-left hover:bg-red-900/40 transition shadow-[0_0_20px_rgba(255,0,0,0.25)] hover:shadow-[0_0_35px_rgba(255,0,0,0.6)]"
    >

      <h3 className="text-2xl font-bold text-red-400 mb-4">
        {title}
      </h3>

      <p className="text-gray-400">
        {description}
      </p>

    </button>

  );

}
