"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [addingCharacterId, setAddingCharacterId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [characterByUser, setCharacterByUser] = useState<Record<string, string>>({});
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

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return users;
    }

    return users.filter((user) => {
      return (
        user.username.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        getRoleLabel(user.role).toLowerCase().includes(term)
      );
    });
  }, [searchTerm, users]);

  const handleCharacterInputChange = (userId: string, value: string) => {
    setCharacterByUser((current) => ({
      ...current,
      [userId]: value,
    }));
  };

  const addCharacterManually = async (user: AdminUser) => {
    const characterName = (characterByUser[user.id] || "").trim();

    if (!characterName) {
      alert("Digite o nome do personagem antes de adicionar.");
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.push("/");
        return;
      }

      setAddingCharacterId(user.id);

      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/admin/users/${user.id}/characters`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: characterName,
          server: "nightslayer",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Erro ao adicionar personagem.");
      }

      setCharacterByUser((current) => ({
        ...current,
        [user.id]: "",
      }));

      alert(`Personagem ${characterName} adicionado para ${user.username}.`);
    } catch (error) {
      console.error("Erro ao adicionar personagem manualmente:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Erro ao adicionar personagem."
      );
    } finally {
      setAddingCharacterId(null);
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
          <button
            onClick={() => router.push("/admin")}
            className="mb-6 text-sm text-gray-400 transition hover:text-red-400"
          >
            Voltar para Admin
          </button>
          <h1 className="text-4xl font-bold text-red-500">
            Todos os Membros
          </h1>

          <p className="text-gray-400 mt-3">
            Pagina exclusiva do Fundador para visualizar e excluir contas do Firebase.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-[#111] border border-red-900 rounded-xl p-4">
            <label className="block text-sm font-semibold text-red-400 mb-2">
              Pesquisar membro
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por username, email ou cargo"
              className="w-full rounded-lg border border-red-900 bg-[#1a1a1a] px-4 py-3 text-white outline-none transition focus:border-red-600"
            />
            <p className="mt-2 text-xs text-gray-500">
              {filteredUsers.length} resultado{filteredUsers.length !== 1 ? "s" : ""}
            </p>
          </div>

          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="bg-[#111] border border-red-900 p-6 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
              <div className="w-full">
                <p className="text-xl font-bold text-red-400">
                  {user.username}
                </p>

                <p className="text-gray-400 text-sm">
                  {user.email || "Sem email"}
                </p>

                <p className="text-gray-500 text-sm">
                  Cargo: {getRoleLabel(user.role)}
                </p>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={characterByUser[user.id] || ""}
                    onChange={(event) =>
                      handleCharacterInputChange(user.id, event.target.value)
                    }
                    placeholder="Adicionar personagem manualmente"
                    className="w-full rounded-lg border border-red-900 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none transition focus:border-red-600"
                  />

                  <button
                    type="button"
                    onClick={() => addCharacterManually(user)}
                    disabled={addingCharacterId === user.id}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    {addingCharacterId === user.id ? "Adicionando..." : "Adicionar personagem"}
                  </button>
                </div>
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
