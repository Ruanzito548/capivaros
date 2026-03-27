"use client";

import { useCallback, useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

import { canApproveMembers } from "@/lib/permissions";

interface LolApplication {
  status?: string;
  riotId?: string;
}

interface LolPendingUser {
  id: string;
  username?: string;
  discord?: string;
  applications?: {
    lol?: LolApplication;
  };
}

export default function AprovarMembrosLOL() {
  const [users, setUsers] = useState<LolPendingUser[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  const fetchUsers = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, "users"));

      const list = snap.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<LolPendingUser, "id">),
        }))
        .filter((user) => user.applications?.lol?.status === "pending");

      setUsers(list);
    } catch (error) {
      console.error("Erro ao buscar usuarios:", error);
    }
  }, []);

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
        console.error("Erro permissao LOL:", error);
        router.push("/");
      }
    });

    return () => unsub();
  }, [fetchUsers, router]);

  const approveUser = async (user: LolPendingUser) => {
    try {
      const ref = doc(db, "users", user.id);

      const updatedApplications = {
        ...user.applications,
        lol: {
          ...user.applications?.lol,
          status: "approved",
        },
      };

      await updateDoc(ref, {
        applications: updatedApplications,
      });

      alert("Jogador aprovado!");
      await fetchUsers();
    } catch (error) {
      console.error("Erro ao aprovar:", error);
      alert("Erro ao aprovar jogador.");
    }
  };

  const rejectUser = async (user: LolPendingUser) => {
    try {
      const ref = doc(db, "users", user.id);

      const updatedApplications = {
        ...user.applications,
        lol: {
          ...user.applications?.lol,
          status: "rejected",
        },
      };

      await updateDoc(ref, {
        applications: updatedApplications,
      });

      alert("Jogador rejeitado.");
      await fetchUsers();
    } catch (error) {
      console.error("Erro ao rejeitar:", error);
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
    <div className="min-h-screen bg-transparent p-12 text-white flex justify-center">
      <div className="max-w-5xl w-full">
        <button
          onClick={() => router.push("/admin/lol")}
          className="mb-6 text-sm text-gray-400 transition hover:text-red-400"
        >
          Voltar para LoL Admin
        </button>

        <h1 className="text-4xl font-bold text-red-500 mb-10">
          Aprovar Jogadores - League of Legends
        </h1>

        <div className="space-y-6">
          {users.length === 0 && (
            <p className="text-gray-400">
              Nenhuma aplicacao pendente.
            </p>
          )}

          {users.map((user) => {
            const riotId = user.applications?.lol?.riotId;
            const opggLink = riotId
              ? `https://www.op.gg/summoners/br/${riotId.replace("#", "-")}`
              : null;

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
                    Riot ID: <span className="text-white">{riotId}</span>
                  </p>
                </div>

                <div className="flex gap-4 flex-wrap">
                  {opggLink && (
                    <a
                      href={opggLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded"
                    >
                      Ver OP.GG
                    </a>
                  )}

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
