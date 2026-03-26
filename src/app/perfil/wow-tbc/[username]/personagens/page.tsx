"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useParams } from "next/navigation";

export default function PersonagensPerfil() {

  const { username } = useParams() as { username: string };

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const [logsData, setLogsData] = useState<any>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const server = "nightslayer";
  const region = "US";

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

  const characters = useMemo(() => {
    return Array.isArray(userData?.characters) ? userData.characters : [];
  }, [userData]);

  const activeCharacter = useMemo(() => {
    return characters[activeIndex];
  }, [characters, activeIndex]);

  useEffect(() => {
    if (activeCharacter) {
      fetchLogs(1047);
    }
  }, [activeCharacter]);

  const fetchLogs = async (zone: number) => {

    if (!activeCharacter) return;

    setLoadingLogs(true);
    setLogsData(null);

    try {

      const res = await fetch(
        `/api/logs?name=${activeCharacter.name}&server=${activeCharacter.server}&region=${region}&zone=${zone}`
      );

      const data = await res.json();

      setLogsData({
        zone,
        percent: data?.percent ?? null,
        median: data?.median ?? null,
        kills: data?.kills ?? 0,
      });

    } catch (error) {
      console.error(error);
    }

    setLoadingLogs(false);

  };

  const getParseColor = (percent: number | null) => {

    if (percent === null) return "text-gray-400";
    if (percent >= 99) return "text-pink-500";
    if (percent >= 95) return "text-orange-500";
    if (percent >= 75) return "text-purple-500";
    if (percent >= 50) return "text-blue-500";
    if (percent >= 25) return "text-green-500";
    return "text-gray-400";

  };

  if (loading) {

    return (
      <div className="min-h-screen bg-transparent text-red-500 flex items-center justify-center">
        Carregando personagens...
      </div>
    );

  }

  if (!userData) {

    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        Usuário não encontrado
      </div>
    );

  }

  return (

    <div className="min-h-screen bg-transparent text-white">

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

          <h1 className="text-5xl font-bold mt-6 text-red-500 drop-shadow-[0_0_15px_rgba(255,0,0,0.8)]">
            {userData.username}
          </h1>

          <span className="mt-4 px-8 py-2 rounded-full text-sm bg-zinc-700">
            {userData.role}
          </span>

        </div>

        {/* PERSONAGENS */}

        <div className="mt-20">

          <h2 className="text-4xl font-bold text-red-500 mb-12 text-center">
            Personagens
          </h2>

          {characters.length > 0 ? (

            <div className="w-full">

              <div className="flex gap-4 mb-8 flex-wrap justify-center">

                {characters.map((char: any, index: number) => (

                  <button
                    key={char.name}
                    onClick={() => {
                      setActiveIndex(index);
                      setLogsData(null);
                    }}
                    className={`px-5 py-2 rounded-lg ${
                      activeIndex === index
                        ? "bg-red-600"
                        : "bg-[#1a1a1a]"
                    }`}
                  >
                    {char.name}
                  </button>

                ))}

              </div>

              {activeCharacter && (

                <div className="bg-[#141414] border border-red-900 rounded-2xl p-6 max-w-4xl mx-auto">

                  <div className="flex justify-between items-center mb-6 flex-wrap gap-4">

                    <h3 className="text-2xl font-bold text-red-400">
                      {activeCharacter.name}
                    </h3>

                    <div className="flex gap-3">

                      <button
                        onClick={() => fetchLogs(1047)}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg"
                      >
                        Logs Karazhan
                      </button>

                      <button
                        onClick={() => fetchLogs(1048)}
                        className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg"
                      >
                        Logs Gruul / Magtheridon
                      </button>

                    </div>

                  </div>

                  {loadingLogs && (
                    <div className="text-yellow-400 text-center mb-6">
                      Buscando logs...
                    </div>
                  )}

                  {logsData && (

                    <div className="bg-[#1c1c1c] p-6 rounded-xl border border-red-900">

                      <p className="text-center mb-4">
                        Raid: {logsData.zone === 1047 ? "Karazhan" : "Gruul / Magtheridon"}
                      </p>

                      <div className="grid grid-cols-3 gap-6 text-center">

                        <div>
                          <p className="text-sm text-gray-400">Best Parse</p>
                          <p className={`text-4xl font-bold ${getParseColor(logsData.percent)}`}>
                            {logsData.percent !== null ? logsData.percent.toFixed(2) : "--"}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-400">Average Parse</p>
                          <p className="text-3xl text-blue-400">
                            {logsData.median !== null ? logsData.median.toFixed(2) : "--"}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-400">Kills</p>
                          <p className="text-3xl text-yellow-400">
                            {logsData.kills}
                          </p>
                        </div>

                      </div>

                    </div>

                  )}

                  <div className="mt-8 bg-[#1c1c1c] p-8 rounded-xl border border-red-900 text-center">

                    <p className="text-lg mb-4 text-gray-400">
                      Ver personagem completo no Armory
                    </p>

                    <a
                      href={`https://classicwowarmory.com/character/US/${activeCharacter.server}/${activeCharacter.name.toLowerCase()}?game_version=classic`}
                      target="_blank"
                      className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-lg"
                    >
                      Abrir Armory
                    </a>

                  </div>

                </div>

              )}

            </div>

          ) : (

            <p className="text-gray-400 text-center">
              Nenhum personagem cadastrado.
            </p>

          )}

        </div>

      </div>

    </div>

  );

}
