"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function PerfilUser() {

  const { username } = useParams() as { username: string };
  const router = useRouter();

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const fetchUser = async () => {

      const snap = await getDocs(collection(db, "users"));

      const user = snap.docs
        .map(doc => doc.data())
        .find((u: any) => u.username.toLowerCase() === username.toLowerCase());

      if (!user) {
        setLoading(false);
        return;
      }

      setUserData(user);
      setLoading(false);

    };

    fetchUser();

  }, [username]);

  if (loading) {

    return (
      <div className="min-h-screen bg-black text-red-500 flex items-center justify-center">
        Carregando perfil...
      </div>
    );

  }

  if (!userData) {

    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Usuário não encontrado
      </div>
    );

  }

  const wowApproved = userData.applications?.["wow-tbc"]?.status === "approved";
  const lolApproved = userData.applications?.["lol"]?.status === "approved";

  const characters = userData.characters || [];
  const trophies = userData.trophies?.["wow-tbc"] || [];
  const mainCharacter = userData.applications?.["wow-tbc"]?.mainCharacter;
  const riotId = userData.applications?.["lol"]?.riotId;

  const navigateToGameProfile = (game: string) => {
    router.push(`/perfil/${game}/${username}`);
  };

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
              src={userData.photoURL || "/capilogo.png"}
              className="w-full h-full object-cover"
            />

          </div>

          <h1 className="text-5xl font-bold mt-6 text-red-500">
            {userData.username}
          </h1>

          <span className="mt-4 px-8 py-2 rounded-full text-sm bg-zinc-700">
            {userData.role}
          </span>

        </div>

        {/* JOGOS */}

        <div className="mt-20 grid md:grid-cols-2 gap-10">

          {/* WOW TBC */}

          {wowApproved && (

            <div
              onClick={() => navigateToGameProfile("wow-tbc")}
              className="bg-[#141414] border border-red-900 rounded-2xl p-8 cursor-pointer hover:bg-red-900/20 transition"
            >

              <h3 className="text-2xl font-bold text-red-400 mb-6">
                World of Warcraft TBC
              </h3>

              {mainCharacter && (
                <div className="mb-4">
                  <p className="text-sm text-gray-400">Personagem Principal</p>
                  <a
                    href={`https://classicwowarmory.com/character/US/nightslayer/${mainCharacter.toLowerCase()}?game_version=classic`}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    className="text-red-400 hover:text-red-300"
                  >
                    {mainCharacter}
                  </a>
                </div>
              )}

              {characters.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400">Personagens: {characters.length}</p>
                </div>
              )}

              <Link
                href={`/perfil/wow-tbc/${username}/personagens`}
                onClick={(e) => e.stopPropagation()}
                className="text-red-400 hover:text-red-300 underline"
              >
                Ver Personagens
              </Link>

            </div>

          )}

          {/* LOL */}

          {lolApproved && (

            <div
              onClick={() => navigateToGameProfile("lol")}
              className="bg-[#141414] border border-red-900 rounded-2xl p-8 cursor-pointer hover:bg-red-900/20 transition"
            >

              <h3 className="text-2xl font-bold text-red-400 mb-6">
                League of Legends
              </h3>

              {riotId && (
                <div className="mb-4">
                  <p className="text-sm text-gray-400">Riot ID</p>
                  <a
                    href={`https://www.op.gg/summoners/br/${riotId.replace("#", "-")}`}
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    className="text-red-400 hover:text-red-300"
                  >
                    {riotId}
                  </a>
                </div>
              )}

            </div>

          )}

        </div>

        {/* TROFÉUS WOW */}

        {wowApproved && trophies.length > 0 && (

          <div className="mt-20">

            <h2 className="text-3xl text-red-400 mb-8 text-center">
              Troféus WoW TBC
            </h2>

            <div className="grid md:grid-cols-4 gap-6">

              {trophies.map((trophy: any, index: number) => (

                <div
                  key={index}
                  className="bg-[#111] border border-red-900 p-6 rounded-xl text-center"
                >

                  <div className="text-4xl mb-3">
                    {trophy.icon || "🏆"}
                  </div>

                  <p className="font-semibold text-red-400">
                    {trophy.name}
                  </p>

                  <p className="text-gray-500 text-sm mt-2">
                    {trophy.description}
                  </p>

                </div>

              ))}

            </div>

          </div>

        )}

        {/* VOLTAR */}

        <div className="mt-20 text-center pb-20">

          <Link
            href="/time"
            className="text-sm text-gray-400 hover:text-red-500 underline"
          >
            Voltar para Times
          </Link>

        </div>

      </div>

    </div>

  );

}
