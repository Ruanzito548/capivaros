"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { canManageRoles } from "@/lib/permissions";

interface ManagedUser {
  id: string;
  username?: string;
  email?: string;
  role?: string;
}

export default function GerenciarCargos() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function fetchUsers() {
    try {
      const snap = await getDocs(collection(db, "users"));

      const list = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<ManagedUser, "id">),
      }));

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

        if (!canManageRoles(data.role)) {
          router.push("/");
          return;
        }

        await fetchUsers();
        setLoading(false);
      } catch (error) {
        console.error("ERRO PERMISSAO CARGOS:", error);
        router.push("/");
      }
    });

    return () => unsub();
  }, [router]);

  const changeRole = async (userId: string, role: string) => {
    try {
      const allowedRoles = [
        "visitor",
        "recruit",
        "member",
        "vip",
        "streamer",
        "officer tbc",
        "fundador",
      ];

      if (!allowedRoles.includes(role)) {
        alert("Cargo invalido");
        return;
      }

      await updateDoc(doc(db, "users", userId), { role });

      alert("Cargo atualizado!");
      await fetchUsers();
    } catch (error) {
      console.error("Erro ao atualizar cargo:", error);
      alert("Erro ao atualizar cargo.");
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
        <h1 className="text-4xl font-bold text-red-500 mb-10 drop-shadow-[0_0_10px_rgba(255,0,0,0.6)]">
          Gerenciar Cargos
        </h1>

        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-[#111] border border-red-800 p-6 rounded-xl flex items-center justify-between shadow-[0_0_10px_rgba(255,0,0,0.15)]"
            >
              <div>
                <p className="text-lg font-semibold">
                  {user.username}
                </p>

                <p className="text-gray-400 text-sm">
                  {user.email}
                </p>
              </div>

              <select
                value={user.role}
                onChange={(e) => changeRole(user.id, e.target.value)}
                className="bg-[#1c1c1c] border border-red-800 p-2 rounded"
              >
                <option value="visitor">Visitor</option>
                <option value="recruit">Recruit</option>
                <option value="member">Member</option>
                <option value="vip">VIP</option>
                <option value="streamer">Streamer</option>
                <option value="officer tbc">Officer TBC</option>
                <option value="fundador">Fundador</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
