"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  addDoc,
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { canApproveMembers } from "@/lib/permissions";

interface WowApplication {
  status?: string;
  mainCharacter?: string;
}

interface PendingUser {
  id: string;
  username?: string;
  discord?: string;
  applications?: {
    "wow-tbc"?: WowApplication;
  };
}

export default function AprovarMembrosWOWTBC() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function fetchUsers() {
    try {
      const snap = await getDocs(collection(db, "users"));

      const list = snap.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<PendingUser, "id">),
        }))
        .filter((user) => user.applications?.["wow-tbc"]?.status === "pending");

      setUsers(list);
    } catch (error) {
      console.error("Erro ao buscar usuarios:", error);
    }
  }

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

        if (!canApproveMembers(data.role)) {
          router.push("/");
          return;
        }

        await fetchUsers();
        setLoading(false);
      } catch (error) {
        console.error("ERRO AO VERIFICAR PERMISSAO:", error);
        router.push("/");
      }
    });

    return () => unsub();
  }, [router]);

  const approveUser = async (user: PendingUser) => {
    try {
      const ref = doc(db, "users", user.id);
      const mainCharacter = user.applications?.["wow-tbc"]?.mainCharacter?.trim();

      const updatedApplications = {
        ...user.applications,
        "wow-tbc": {
          ...user.applications?.["wow-tbc"],
          status: "approved",
        },
      };

      await updateDoc(ref, {
        role: "member",
        applications: updatedApplications,
      });

      if (mainCharacter) {
        const existingRequestQuery = query(
          collection(db, "characterRequests"),
          where("name", "==", mainCharacter)
        );

        const existingRequestSnap = await getDocs(existingRequestQuery);

        const hasOpenOrApprovedRequest = existingRequestSnap.docs.some((docSnap) => {
          const data = docSnap.data();
          return data.status === "pending" || data.status === "approved";
        });

        if (!hasOpenOrApprovedRequest) {
          await addDoc(collection(db, "characterRequests"), {
            username: user.username,
            userId: user.id,
            name: mainCharacter,
            server: "nightslayer",
            region: "US",
            status: "pending",
            createdAt: new Date(),
          });
        }
      }

      alert("Membro aprovado com sucesso.");
      await fetchUsers();
    } catch (error) {
      console.error("Erro ao aprovar usuario:", error);
      alert("Erro ao aprovar usuario.");
    }
  };

  const rejectUser = async (user: PendingUser) => {
    try {
      const ref = doc(db, "users", user.id);

      const updatedApplications = {
        ...user.applications,
        "wow-tbc": {
          ...user.applications?.["wow-tbc"],
          status: "rejected",
        },
      };

      await updateDoc(ref, {
        applications: updatedApplications,
      });

      alert("Membro rejeitado.");
      await fetchUsers();
    } catch (error) {
      console.error("Erro ao rejeitar usuario:", error);
      alert("Erro ao rejeitar.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Verificando permissoes...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white p-12 flex justify-center">
      <div className="max-w-5xl w-full">
        <h1 className="text-4xl font-bold text-red-500 mb-10">
          Aprovar Membros - WoW TBC
        </h1>

        <div className="space-y-6">
          {users.length === 0 && (
            <p className="text-gray-400">
              Nenhuma aplicacao pendente.
            </p>
          )}

          {users.map((user) => {
            const character = user.applications?.["wow-tbc"]?.mainCharacter;

            return (
              <div
                key={user.id}
                className="bg-[#111] border border-red-900 p-6 rounded-xl shadow-[0_0_10px_rgba(255,0,0,0.15)]"
              >
                <div className="mb-4">
                  <p className="text-lg font-semibold text-red-400">
                    {user.username}
                  </p>

                  <p className="text-gray-400 text-sm">
                    Discord: {user.discord}
                  </p>

                  <p className="text-gray-400 text-sm">
                    Personagem: <span className="text-white">{character}</span>
                  </p>
                </div>

                <div className="flex gap-4 flex-wrap">
                  <a
                    href={`https://classicwowarmory.com/character/us/nightslayer/${character?.toLowerCase()}?game_version=classic`}
                    target="_blank"
                    className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded"
                  >
                    Ver Armory
                  </a>

                  <button
                    onClick={() => approveUser(user)}
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
                  >
                    Aprovar
                  </button>

                  <button
                    onClick={() => rejectUser(user)}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
                  >
                    Rejeitar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
