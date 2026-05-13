"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { canManageRoles } from "@/lib/permissions";
import TrophyIcon from "@/components/trophy-icon";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AdminTrophy {
  id: string;
  name: string;
  description: string;
  icon?: string;
  game: string;
}

const MEDAL_ICON_OPTIONS = [
  { label: "1 Karazhan", value: "/trofeus/1kara.png" },
  { label: "2 Karazhan", value: "/trofeus/2kara.png" },
  { label: "3 Karazhan", value: "/trofeus/3kara.png" },
  { label: "1 Gruul/Mag", value: "/trofeus/1mag.png" },
  { label: "2 Gruul/Mag", value: "/trofeus/2mag.png" },
  { label: "3 Gruul/Mag", value: "/trofeus/3mag.png" },
];

export default function AdminTrofeusPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [trophies, setTrophies] = useState<AdminTrophy[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedTrophyId, setSelectedTrophyId] = useState("");
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState(MEDAL_ICON_OPTIONS[0].value);
  const router = useRouter();

  const getToken = useCallback(async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      router.push("/");
      throw new Error("Usuario nao autenticado.");
    }

    return currentUser.getIdToken();
  }, [router]);

  const fetchUsers = useCallback(async () => {
    const token = await getToken();
    const response = await fetch("/api/admin/users", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || "Erro ao buscar membros.");
    }

    const data = (await response.json()) as AdminUser[];
    setUsers(data);

    if (!selectedUserId && data.length > 0) {
      setSelectedUserId(data[0].id);
    }
  }, [getToken, selectedUserId]);

  const fetchTrophies = useCallback(async () => {
    const token = await getToken();
    const response = await fetch("/api/admin/trophies", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || "Erro ao buscar trofeus.");
    }

    const data = (await response.json()) as AdminTrophy[];
    setTrophies(data);

    if (!selectedTrophyId && data.length > 0) {
      setSelectedTrophyId(data[0].id);
    }
  }, [getToken, selectedTrophyId]);

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

        await Promise.all([fetchUsers(), fetchTrophies()]);
        setLoading(false);
      } catch (error) {
        console.error("Erro ao carregar pagina de trofeus:", error);
        router.push("/");
      }
    });

    return () => unsub();
  }, [fetchTrophies, fetchUsers, router]);

  const handleCreateTrophy = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setCreating(true);
      const token = await getToken();
      const response = await fetch("/api/admin/trophies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description,
          icon,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Erro ao criar trofeu.");
      }

      setName("");
      setDescription("");
      setIcon(MEDAL_ICON_OPTIONS[0].value);
      await fetchTrophies();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao criar trofeu.");
    } finally {
      setCreating(false);
    }
  };

  const handleAssignTrophy = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setAssigning(true);
      const token = await getToken();
      const response = await fetch("/api/admin/trophies/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: selectedUserId,
          trophyId: selectedTrophyId,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Erro ao atribuir trofeu.");
      }

      alert("Trofeu atribuido com sucesso.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao atribuir trofeu.");
    } finally {
      setAssigning(false);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      setSeeding(true);
      const token = await getToken();
      const response = await fetch("/api/admin/trophies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          seedDefaults: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Erro ao criar trofeus base.");
      }

      const data = (await response.json()) as { created?: number };
      await fetchTrophies();
      alert(
        data.created
          ? `${data.created} trofeus base criados com sucesso.`
          : "Os trofeus base ja estavam cadastrados."
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao criar trofeus base.");
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent text-white">
        Carregando trofeus...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent p-12 text-white">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={() => router.push("/admin")}
          className="mb-6 text-sm text-gray-400 transition hover:text-red-400"
        >
          Voltar para Admin
        </button>

        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-red-500">
              Trofeus
            </h1>

            <p className="mt-3 text-gray-400">
              Pagina exclusiva do Fundador para criar trofeus e atribui-los manualmente aos membros.
            </p>
          </div>

          <button
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="rounded-lg bg-yellow-700 px-5 py-3 hover:bg-yellow-800 disabled:opacity-60"
          >
            {seeding ? "Criando trofeus base..." : "Criar 8 trofeus base"}
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <form
            onSubmit={handleCreateTrophy}
            className="rounded-2xl border border-red-900 bg-[#111] p-8"
          >
            <h2 className="mb-6 text-2xl font-bold text-red-400">
              Criar novo trofeu
            </h2>

            <label className="mb-4 block text-sm text-gray-300">
              Nome do trofeu
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-red-900 bg-[#1b1b1b] p-3 text-white"
                placeholder="Ex.: MVP Karazhan"
                required
              />
            </label>

            <label className="mb-4 block text-sm text-gray-300">
              Descricao
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-2 min-h-28 w-full rounded-lg border border-red-900 bg-[#1b1b1b] p-3 text-white"
                placeholder="Descreva o motivo desse trofeu."
                required
              />
            </label>

            <div className="mb-6">
              <p className="mb-3 text-sm text-gray-300">
                Icone
              </p>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {MEDAL_ICON_OPTIONS.map((option) => {
                  const isSelected = icon === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setIcon(option.value)}
                      className={`rounded-xl border p-4 text-center transition ${
                        isSelected
                          ? "border-red-500 bg-red-900/30"
                          : "border-red-900 bg-[#1b1b1b] hover:border-red-700"
                      }`}
                    >
                      <div className="mb-2 flex justify-center">
                        <TrophyIcon
                          icon={option.value}
                          alt={option.label}
                          className="h-14 w-14"
                        />
                      </div>

                      <div className="text-xs text-gray-300">
                        {option.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-red-700 px-5 py-3 hover:bg-red-800 disabled:opacity-60"
            >
              {creating ? "Criando..." : "Criar trofeu"}
            </button>
          </form>

          <form
            onSubmit={handleAssignTrophy}
            className="rounded-2xl border border-red-900 bg-[#111] p-8"
          >
            <h2 className="mb-6 text-2xl font-bold text-red-400">
              Atribuir trofeu ao jogador
            </h2>

            <label className="mb-4 block text-sm text-gray-300">
              Jogador
              <select
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="mt-2 w-full rounded-lg border border-red-900 bg-[#1b1b1b] p-3 text-white"
                required
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.role})
                  </option>
                ))}
              </select>
            </label>

            <label className="mb-6 block text-sm text-gray-300">
              Trofeu
              <select
                value={selectedTrophyId}
                onChange={(event) => setSelectedTrophyId(event.target.value)}
                className="mt-2 w-full rounded-lg border border-red-900 bg-[#1b1b1b] p-3 text-white"
                required
              >
                {trophies.map((trophy) => (
                  <option key={trophy.id} value={trophy.id}>
                    {trophy.name}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={assigning}
              className="rounded-lg bg-red-700 px-5 py-3 hover:bg-red-800 disabled:opacity-60"
            >
              {assigning ? "Atribuindo..." : "Atribuir trofeu"}
            </button>
          </form>
        </div>

        <div className="mt-10 rounded-2xl border border-red-900 bg-[#111] p-8">
          <h2 className="mb-6 text-2xl font-bold text-red-400">
            Trofeus cadastrados
          </h2>

          {trophies.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {trophies.map((trophy) => (
                <div
                  key={trophy.id}
                  className="rounded-xl border border-red-900/60 bg-black/20 p-5"
                >
                  <div className="mb-3 flex justify-center">
                    <TrophyIcon
                      icon={trophy.icon}
                      alt={trophy.name}
                      className="h-16 w-16"
                    />
                  </div>

                  <p className="font-semibold text-red-400">
                    {trophy.name}
                  </p>

                  <p className="mt-2 text-sm text-gray-400">
                    {trophy.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">
              Nenhum trofeu cadastrado ainda.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
