"use client";

import { useCallback, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { canManageRoles, getRoleLabel } from "@/lib/permissions";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: number | null;
}

export default function AdminMembersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const fetchUsers = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      router.push("/");
      return;
    }

    const token = await currentUser.getIdToken();
    const response = await fetch("/api/admin/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || "Erro ao buscar membros.");
    }

    const list = (await response.json()) as AdminUser[];
    setUsers(list);
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

        if (!canManageRoles(data.role)) {
          router.push("/");
          return;
        }

        await fetchUsers();
        setLoading(false);
      } catch (error) {
        console.error("Erro ao carregar membros:", error);
        router.push("/");
      }
    });

    return () => unsub();
  }, [fetchUsers, router]);

  const deleteUser = async (user: AdminUser) => {
    const confirmed = window.confirm(
      `Deseja realmente excluir a conta de ${user.username}?`
    );

    if (!confirmed) return;

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.push("/");
        return;
      }

      setDeletingId(user.id);

      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Erro ao excluir conta.");
      }

      await fetchUsers();
    } catch (error) {
      console.error("Erro ao excluir conta:", error);
      alert(
        error instanceof Error ? error.message : "Erro ao excluir conta."
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent text-white">
        Carregando membros...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white p-12 flex justify-center">
      <div className="max-w-6xl w-full">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-red-500">
            Todos os Membros
          </h1>

          <p className="text-gray-400 mt-3">
            Pagina exclusiva do Fundador para visualizar e excluir contas do Firebase.
          </p>
        </div>

        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-[#111] border border-red-900 p-6 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div>
                <p className="text-xl font-bold text-red-400">
                  {user.username}
                </p>

                <p className="text-gray-400 text-sm">
                  {user.email || "Sem email"}
                </p>

                <p className="text-gray-500 text-sm">
                  Cargo: {getRoleLabel(user.role)}
                </p>
              </div>

              <button
                onClick={() => deleteUser(user)}
                disabled={deletingId === user.id}
                className="bg-red-700 hover:bg-red-800 disabled:opacity-60 px-5 py-3 rounded-lg"
              >
                {deletingId === user.id ? "Excluindo..." : "Excluir Conta"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
