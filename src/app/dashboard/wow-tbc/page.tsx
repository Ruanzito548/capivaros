"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { getRoleLabel } from "@/lib/permissions";
import { getGameTrophies, Trophy } from "@/lib/trophies";
import TrophyIcon from "@/components/trophy-icon";

interface WowDashboardUserData {
  username?: string;
  role?: string;
  photoURL?: string;
  coverURL?: string;
}

interface ActionCardProps {
  title: string;
  description: string;
  onClick: () => void;
  footer?: string;
}

export default function DashboardWOWTBC() {
  const [userData, setUserData] = useState<WowDashboardUserData | null>(null);
  const [trophies, setTrophies] = useState<Trophy[]>([]);
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
      setTrophies(getGameTrophies(data.trophies, "wow-tbc"));

      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  const handleApply = async () => {
    if (!mainCharacter.trim() || !userData) return;

    const user = auth.currentUser;
    if (!user) return;

    const token = await user.getIdToken();
    const response = await fetch("/api/character-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: mainCharacter.trim(),
        server: "nightslayer",
        region: "US",
        setAsMainCharacter: true,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      alert(data?.error || "Erro ao enviar aplicacao.");
      return;
    }

    alert("Aplicacao enviada! Seu personagem principal foi solicitado para aprovacao.");
    setMainCharacter("");

    const snap = await getDoc(doc(db, "users", user.uid));
    const data = snap.data();
    setUserData({
      ...data,
      photoURL: data?.photoURL || "/capilogo.png",
      coverURL: data?.coverURL || "/capa.jpg",
    });
    setTrophies(getGameTrophies(data?.trophies, "wow-tbc"));
  };

  if (loading || !userData) {
    return (
      <div className="min-h-screen bg-transparent text-red-500 flex items-center justify-center">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white">
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

          <h1 className="text-5xl font-bold mt-6 text-red-500 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">
            {userData.username}
          </h1>

          <span className="mt-4 px-8 py-2 rounded-full text-sm bg-zinc-700">
            {getRoleLabel(userData.role)}
          </span>
        </div>

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

        <div className="mt-20 grid md:grid-cols-2 gap-10">
          <ActionCard
            title="Personagens"
            description="Gerencie seus personagens cadastrados."
            onClick={() => router.push("/dashboard/wow-tbc/characters")}
          />

          <ActionCard
            title="Trofeus"
            description="Acompanhe suas conquistas."
            onClick={() => router.push("/dashboard/wow-tbc/trofeus")}
            footer={`${trophies.length} trofeus desbloqueados`}
          />
        </div>

        {trophies.length > 0 && (
          <div className="mt-20">
            <h2 className="mb-6 text-center text-3xl text-red-400">
              Trofeus do WoW TBC
            </h2>

            <div className="grid gap-6 md:grid-cols-4">
              {trophies.map((trophy, index) => (
                <div
                  key={`${trophy.name}-${index}`}
                  className="rounded-xl border border-red-900 bg-[#111] p-6 text-center shadow-[0_0_10px_rgba(255,0,0,0.2)]"
                >
                  <div className="mb-3 flex justify-center text-4xl">
                    <TrophyIcon
                      icon={trophy.icon}
                      alt={trophy.name}
                      className="h-14 w-14"
                    />
                  </div>

                  <p className="font-semibold text-red-400">
                    {trophy.name}
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    {trophy.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

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

function ActionCard({ title, description, onClick, footer }: ActionCardProps) {
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

      {footer ? (
        <div className="mt-4 text-sm text-yellow-400">
          {footer}
        </div>
      ) : null}
    </button>
  );
}
