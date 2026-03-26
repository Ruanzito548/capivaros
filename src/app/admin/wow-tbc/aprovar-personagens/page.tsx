"use client";

import { useCallback, useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  doc,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { canApproveCharacters } from "@/lib/permissions";

interface CharacterRequest {
  id: string;
  userId: string;
  username: string;
  name: string;
  server: string;
  status: string;
}

export default function AprovarPersonagens() {
  const [requests, setRequests] = useState<CharacterRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchRequests = useCallback(async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.push("/");
        return;
      }

      const token = await currentUser.getIdToken();
      const response = await fetch("/api/admin/wow-tbc/character-requests", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Erro ao buscar requests.");
      }

      const list = (await response.json()) as CharacterRequest[];

      setRequests(list);
    } catch (error) {
      console.error("Erro ao buscar requests:", error);
    }
  }, [router]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          router.push("/");
          return;
        }

        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

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
      } catch (error) {
        console.error("ERRO AO VERIFICAR PERMISSAO:", error);
        router.push("/");
      }
    });

    return () => unsub();
  }, [fetchRequests, router]);

  const approveCharacter = async (req: CharacterRequest) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.push("/");
        return;
      }

      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/admin/character-requests/${req.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "approve",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        alert(data?.error || "Erro ao aprovar personagem.");
        return;
      }

      alert("Personagem aprovado com sucesso.");
      await fetchRequests();
    } catch (error) {
      console.error("Erro ao aprovar personagem:", error);
      alert("Erro ao aprovar personagem.");
    }
  };

  const rejectCharacter = async (req: CharacterRequest) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.push("/");
        return;
      }

      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/admin/character-requests/${req.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "reject",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        alert(data?.error || "Erro ao rejeitar.");
        return;
      }

      await fetchRequests();
    } catch (error) {
      console.error("Erro ao rejeitar personagem:", error);
      alert("Erro ao rejeitar.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent text-white">
        Verificando permissoes...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white p-12 flex justify-center">
      <div className="max-w-5xl w-full">
        <h1 className="text-4xl font-bold text-red-500 mb-10">
          Aprovar Personagens - WoW TBC
        </h1>

        <div className="space-y-6">
          {requests.length === 0 && (
            <p className="text-gray-400">
              Nenhuma solicitacao pendente.
            </p>
          )}

          {requests.map((req) => (
            <div
              key={req.id}
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
