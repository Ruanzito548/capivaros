"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";

interface DashboardUserData {
  username?: string;
  discord?: string;
  role?: string;
  photoURL?: string;
  coverURL?: string;
  applications?: Record<string, Record<string, string>>;
}

interface GameCardProps {
  title: string;
  status?: string;
  onRequest: () => void;
  onEnter: () => void;
  character?: string;
  setCharacter?: (value: string) => void;
}

export default function Dashboard() {
  const [userData, setUserData] = useState<DashboardUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [character, setCharacter] = useState("");

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

      if (!data?.username || !data?.discord) {
        router.push("/complete-profile");
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

  const requestJoin = async () => {
    const user = auth.currentUser;
    if (!user || !userData) return;

    if (!character.trim()) {
      alert("Digite seu personagem principal");
      return;
    }

    const token = await user.getIdToken();
    const response = await fetch("/api/character-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: character.trim(),
        server: "nightslayer",
        region: "US",
        setAsMainCharacter: true,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      alert(data?.error || "Erro ao solicitar personagem.");
      return;
    }

    const applications = {
      ...(userData.applications || {}),
      "wow-tbc": {
        status: "pending",
        mainCharacter: character.trim(),
      },
    };

    await updateDoc(doc(db, "users", user.uid), { applications });

    setUserData({
      ...userData,
      applications,
    });
  };

  if (loading || !userData) {
    return (
      <div className="min-h-screen bg-black text-red-500 flex items-center justify-center">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b0b0b] to-[#120000] text-white">
      <div className="relative h-[350px] w-full overflow-hidden">
        <img
          src={userData.coverURL || "/capa.jpg"}
          className="w-full h-full object-cover"
          alt=""
        />

        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <div className="relative -mt-24 flex flex-col items-center">
          <div className="w-[160px] h-[160px] rounded-full border-4 border-red-600 overflow-hidden shadow-[0_0_30px_rgba(255,0,0,0.7)]">
            <img
              src={userData.photoURL || "/capilogo.png"}
              className="w-full h-full object-cover"
              alt={userData.username || "Avatar"}
            />
          </div>

          <h1 className="text-5xl font-bold mt-6 text-red-500">
            {userData.username}
          </h1>

          <span className="mt-4 px-8 py-2 rounded-full text-sm bg-zinc-700">
            {userData.role}
          </span>
        </div>

        <div className="mt-20">
          <h2 className="text-3xl text-red-400 mb-8 text-center">
            Entrar na Guilda
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <GameCard
              title="World of Warcraft TBC"
              status={userData.applications?.["wow-tbc"]?.status}
              character={character}
              setCharacter={setCharacter}
              onRequest={requestJoin}
              onEnter={() => router.push("/dashboard/wow-tbc")}
            />

            {/* LOL */}
            {/* Descomente quando quiser reativar a entrada de LoL no perfil. */}
          </div>
        </div>

        <div className="mt-20 text-center pb-20">
          <button
            onClick={() => router.push("/dashboard/edit")}
            className="text-sm text-gray-400 hover:text-red-500 underline"
          >
            Editar Perfil
          </button>
        </div>
      </div>
    </div>
  );
}

function GameCard({
  title,
  status,
  onRequest,
  onEnter,
  character,
  setCharacter,
}: GameCardProps) {
  return (
    <div className="bg-[#141414] border border-red-900 rounded-2xl p-8 shadow-[0_0_20px_rgba(255,0,0,0.25)]">
      <h3 className="text-2xl font-bold text-red-400 mb-6">
        {title}
      </h3>

      {status === "approved" && (
        <button
          onClick={onEnter}
          className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg transition"
        >
          Entrar no Painel
        </button>
      )}

      {status === "pending" && (
        <span className="text-yellow-400 font-semibold">
          Solicitacao enviada
        </span>
      )}

      {!status && (
        <>
          <input
            type="text"
            placeholder="Personagem principal"
            value={character}
            onChange={(e) => setCharacter?.(e.target.value)}
            className="w-full mb-4 p-3 bg-[#1c1c1c] border border-red-900 rounded-lg"
          />

          <button
            onClick={onRequest}
            className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg transition"
          >
            Solicitar Entrada
          </button>
        </>
      )}
    </div>
  );
}
