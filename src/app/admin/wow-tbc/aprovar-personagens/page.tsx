"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  query,
  where
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { canApproveCharacters } from "@/lib/permissions";

export default function AprovarPersonagens() {

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {

    const unsub = onAuthStateChanged(auth, async (user) => {

      if (!user) {
        router.push("/");
        return;
      }

      const snap = await getDoc(doc(db, "users", user.uid));

      if (!snap.exists()) {
        router.push("/");
        return;
      }

      const data = snap.data();

      if (!canApproveCharacters(data.role)) {
        router.push("/");
        return;
      }

      await fetchRequests();
      setLoading(false);

    });

    return () => unsub();

  }, []);

  const fetchRequests = async () => {

    const q = query(collection(db, "characterRequests"), where("status", "==", "pending"));
    const snap = await getDocs(q);

    const list: any[] = [];

    snap.docs.forEach((docSnap) => {

      const data: any = docSnap.data();

      list.push({
        id: docSnap.id,
        ...data
      });

    });

    setRequests(list);

  };

  const approveCharacter = async (req: any) => {

    try {

      // Update request status
      await updateDoc(doc(db, "characterRequests", req.id), {
        status: "approved"
      });

      // Add to user's characters
      const userRef = doc(db, "users", req.userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        alert("Usuário não encontrado.");
        return;
      }

      const userData = userSnap.data();
      const characters = Array.isArray(userData?.characters) ? userData.characters : [];

      characters.push({
        name: req.name,
        server: req.server
      });

      await updateDoc(userRef, {
        characters: characters
      });

      alert("Personagem aprovado com sucesso.");
      fetchRequests();

    } catch (error) {
      console.error("Erro ao aprovar personagem:", error);
      alert("Erro ao aprovar personagem. Verifique o console.");
    }

  };

  const rejectCharacter = async (req: any) => {

    await updateDoc(doc(db, "characterRequests", req.id), {
      status: "rejected"
    });

    fetchRequests();

  };

  if (loading) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Verificando permissões...
      </div>
    );

  }

  return (

    <div className="min-h-screen bg-[#0b0b0b] text-white p-12 flex justify-center">

      <div className="max-w-5xl w-full">

        <h1 className="text-4xl font-bold text-red-500 mb-10">
          Aprovar Personagens — WoW TBC
        </h1>

        <div className="space-y-6">

          {requests.length === 0 && (
            <p className="text-gray-400">
              Nenhuma solicitação pendente.
            </p>
          )}

          {requests.map((req, i) => (

            <div
              key={i}
              className="bg-[#111] border border-red-900 p-6 rounded-xl shadow-[0_0_10px_rgba(255,0,0,0.15)]"
            >

              <p className="mb-2">
                <b>Solicitado por:</b> {req.username}
              </p>

              <p className="mb-4">
                <b>Personagem:</b> {req.name}
              </p>

              <div className="flex gap-4 flex-wrap">

                <a
                  href={`https://classicwowarmory.com/character/us/${req.server}/${req.name.toLowerCase()}?game_version=classic`}
                  target="_blank"
                  className="bg-yellow-500 text-black px-4 py-2 rounded"
                >
                  Ver Armory
                </a>

                <button
                  onClick={() => approveCharacter(req)}
                  className="bg-green-600 px-4 py-2 rounded"
                >
                  Aprovar
                </button>

                <button
                  onClick={() => rejectCharacter(req)}
                  className="bg-red-600 px-4 py-2 rounded"
                >
                  Rejeitar
                </button>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>

  );

}