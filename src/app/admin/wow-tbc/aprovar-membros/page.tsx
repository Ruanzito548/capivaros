"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { canApproveMembers } from "@/lib/permissions";

export default function AprovarMembrosWOWTBC() {

  const [users, setUsers] = useState<any[]>([]);
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

      if (!canApproveMembers(data.role)) {
        router.push("/");
        return;
      }

      await fetchUsers();
      setLoading(false);

    });

    return () => unsub();

  }, []);

  const fetchUsers = async () => {

    const snap = await getDocs(collection(db, "users"));

    const list = snap.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter((user: any) =>
        user.applications?.["wow-tbc"]?.status === "pending"
      );

    setUsers(list);

  };

  const approveUser = async (user: any) => {

    const ref = doc(db, "users", user.id);

    const updatedApplications = {
      ...user.applications,
      "wow-tbc": {
        ...user.applications["wow-tbc"],
        status: "approved"
      }
    };

    await updateDoc(ref, {
      role: "member",
      applications: updatedApplications
    });

    fetchUsers();

  };

  const rejectUser = async (user: any) => {

    const ref = doc(db, "users", user.id);

    const updatedApplications = {
      ...user.applications,
      "wow-tbc": {
        ...user.applications["wow-tbc"],
        status: "rejected"
      }
    };

    await updateDoc(ref, {
      applications: updatedApplications
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

        <h1 className="text-4xl font-bold text-red-500 mb-10">
          Aprovar Membros — WoW TBC
        </h1>

        <div className="space-y-6">

          {users.length === 0 && (

            <p className="text-gray-400">
              Nenhuma aplicação pendente.
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