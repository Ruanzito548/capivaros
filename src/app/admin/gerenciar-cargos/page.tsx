"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";

import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

import { canManageRoles } from "@/lib/permissions";

export default function GerenciarCargos() {

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  // ------------------------
  // verificar permissão
  // ------------------------

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

      if (!canManageRoles(data.role)) {
        router.push("/");
        return;
      }

      await fetchUsers();
      setLoading(false);

    });

    return () => unsub();

  }, []);

  // ------------------------
  // buscar usuários
  // ------------------------

  const fetchUsers = async () => {

    const snap = await getDocs(collection(db, "users"));

    const list = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setUsers(list);

  };

  // ------------------------
  // alterar cargo
  // ------------------------

  const changeRole = async (userId: string, role: string) => {

    await updateDoc(doc(db, "users", userId), {
      role: role
    });

    fetchUsers();

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

        <h1 className="text-4xl font-bold text-red-500 mb-10 drop-shadow-[0_0_10px_rgba(255,0,0,0.6)]">
          Gerenciar Cargos
        </h1>

        <div className="space-y-4">

          {users.map((u) => (

            <div
              key={u.id}
              className="bg-[#111] border border-red-800 p-6 rounded-xl flex items-center justify-between shadow-[0_0_10px_rgba(255,0,0,0.15)]"
            >

              <div>

                <p className="text-lg font-semibold">
                  {u.username}
                </p>

                <p className="text-gray-400 text-sm">
                  {u.email}
                </p>

              </div>

              <select
                value={u.role}
                onChange={(e) =>
                  changeRole(u.id, e.target.value)
                }
                className="bg-[#1c1c1c] border border-red-800 p-2 rounded"
              >

                <option value="recruit">Recruit</option>
                <option value="member">Member</option>
                <option value="vip">VIP</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>

              </select>

            </div>

          ))}

        </div>

      </div>

    </div>

  );

}