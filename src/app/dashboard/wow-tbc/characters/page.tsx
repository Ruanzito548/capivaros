"use client";

import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs as getDocsQuery
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function CharactersPage() {

  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [characters, setCharacters] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [profile, setProfile] = useState<any>(null);

  const [logsData, setLogsData] = useState<any>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const router = useRouter();

  const server = "nightslayer";
  const region = "US";

  useEffect(() => {

    const unsub = onAuthStateChanged(auth, async (u) => {

      if (!u) {
        router.push("/login");
        return;
      }

      setUser(u);

      const snap = await getDoc(doc(db, "users", u.uid));
      const data = snap.data();

      setUsername(data?.username || "");
      setCharacters(Array.isArray(data?.characters) ? data.characters : []);
      setProfile({
        ...data,
        photoURL: data?.photoURL || "/capilogo.png",
      });

      const pendingSnap = await getDocsQuery(
        query(
          collection(db, "characterRequests"),
          where("userId", "==", u.uid),
          where("status", "==", "pending")
        )
      );

      const pending = pendingSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPendingRequests(pending);

    });

    return () => unsub();

  }, [router]);

  const activeCharacter = useMemo(() => {
    return characters[activeIndex];
  }, [characters, activeIndex]);

  useEffect(() => {
    if (activeCharacter) {
      fetchLogs(1047);
    }
  }, [activeCharacter]);

  const handleAddCharacter = async () => {

    if (!characterName.trim() || !user) return;

    const name = characterName.trim();

    if (
      characters.some(
        (c) => c.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      alert("Esse personagem já foi cadastrado.");
      return;
    }

    await addDoc(collection(db, "characterRequests"), {

      username: username,
      userId: user.uid,
      name: name,
      server: server,
      region: region,
      status: "pending",
      createdAt: new Date()

    });

    alert("Personagem enviado para aprovação.");

    setCharacterName("");

    const pendingSnap = await getDocsQuery(
      query(
        collection(db, "characterRequests"),
        where("userId", "==", user.uid),
        where("status", "==", "pending")
      )
    );

    const pending = pendingSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setPendingRequests(pending);

  };

  const handleRemoveCharacter = async (index: number) => {

    if (!user) return;

    const updatedCharacters = characters.filter((_, i) => i !== index);

    await updateDoc(doc(db, "users", user.uid), {
      characters: updatedCharacters,
    });

    setCharacters(updatedCharacters);

    if (updatedCharacters.length === 0) {
      setActiveIndex(0);
    } else if (index <= activeIndex) {
      setActiveIndex(0);
    }

  };

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

  return (

    <div className="min-h-screen bg-[#0b0b0b] text-white flex flex-col items-center py-16">

      {profile && (

        <div className="w-full relative -mt-28 mb-12">

          <div className="relative h-[360px] w-full overflow-hidden">

            <img
              src={profile.coverURL || "/capa.jpg"}
              className="w-full h-full object-cover"
              alt="Capa do perfil"
            />

            <div className="absolute inset-0 bg-black/60" />

          </div>

          <div className="relative -mt-24 flex flex-col items-center">

            <div className="w-[160px] h-[160px] rounded-full border-4 border-red-600 overflow-hidden shadow-[0_0_30px_rgba(255,0,0,0.7)]">

              <img
                src={profile.photoURL}
                className="w-full h-full object-cover"
                alt="Avatar"
              />

            </div>

            <h2 className="text-5xl font-bold text-red-500 mt-6">
              {profile.username}
            </h2>

            <span className="mt-4 px-8 py-2 rounded-full text-sm bg-zinc-700">
              {profile.role}
            </span>

          </div>

        </div>

      )}

      <div className="w-full max-w-6xl space-y-10 px-6 pt-20">

        <div className="w-full max-w-3xl bg-[#141414] border border-red-900 rounded-2xl p-8 mx-auto">

          <div className="flex gap-4">

            <input
              type="text"
              placeholder="Nome do Personagem"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              className="flex-1 p-3 bg-[#1c1c1c] border border-red-900 rounded-lg"
            />

            <button
              onClick={handleAddCharacter}
              className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg"
            >
              Enviar para Aprovação
            </button>

          </div>

        </div>

        {pendingRequests.length > 0 && (

          <div className="w-full max-w-3xl bg-[#141414] border border-yellow-600 rounded-2xl p-8 mx-auto space-y-4">

            <h2 className="text-2xl font-bold text-yellow-400 mb-6">
              Personagens Pendentes de Aprovação
            </h2>

            {pendingRequests.map((req) => (

              <div
                key={req.id}
                className="bg-[#1c1c1c] border border-yellow-900 p-4 rounded-lg flex justify-between items-center"
              >

                <div>

                  <p className="text-lg font-bold text-yellow-400">{req.name}</p>
                  <p className="text-sm text-gray-400">
                    Servidor: {req.server} | Status: Pendente
                  </p>

                </div>

                <span className="text-yellow-500 font-semibold">Aguardando Aprovação</span>

              </div>

            ))}

          </div>

        )}

        {characters.length > 0 && (

          <div className="space-y-6">

            <div className="w-full flex flex-wrap gap-4 justify-center">

              {characters.map((char, index) => (

                <div key={char.name} className="flex items-center">

                  <button
                    onClick={() => {
                      setActiveIndex(index);
                      setLogsData(null);
                    }}
                    className={`px-5 py-2 rounded-l-lg ${
                      activeIndex === index ? "bg-red-600" : "bg-[#1a1a1a]"
                    }`}
                  >
                    {char.name}
                  </button>

                  <button
                    onClick={() => handleRemoveCharacter(index)}
                    className="bg-[#1a1a1a] border border-red-900 px-3 py-2 rounded-r-lg"
                  >
                    ✕
                  </button>

                </div>

              ))}

            </div>

            {activeCharacter && (

              <div className="bg-[#141414] border border-red-900 rounded-2xl p-6 mx-auto max-w-4xl space-y-6">

                <div className="flex justify-between items-center mb-6 flex-wrap gap-4">

                  <h2 className="text-2xl font-bold text-red-400">{activeCharacter.name}</h2>

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
                  <div className="text-yellow-400 text-center mb-6">Buscando logs...</div>
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

        )}

      </div>

    </div>

  );

}
