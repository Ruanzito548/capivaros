"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { canManageRoles } from "@/lib/permissions";
import type {
  DiscordBotLogEntry,
  DiscordBotPanelPayload,
  DiscordBotSettings,
} from "@/lib/discord-bot-admin";
import { defaultDiscordBotSettings } from "@/lib/discord-bot-admin";

type BotAction = "heartbeat" | "sync_commands" | "test_message";

function formatDate(value: number | null) {
  if (!value) {
    return "Nunca";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

function statusTone(active: boolean) {
  return active
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
    : "border-red-500/30 bg-red-500/10 text-red-300";
}

export default function DiscordBotAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningAction, setRunningAction] = useState<BotAction | null>(null);
  const [settings, setSettings] = useState<DiscordBotSettings>(
    defaultDiscordBotSettings
  );
  const [logs, setLogs] = useState<DiscordBotLogEntry[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [environment, setEnvironment] = useState({
    hasBotToken: false,
    hasPublicKey: false,
    hasClientSecret: false,
    clientIdFromEnv: null as string | null,
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const fetchPanel = useCallback(async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      router.push("/");
      return;
    }

    const token = await currentUser.getIdToken();
    const response = await fetch("/api/admin/discord-bot", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = (await response.json()) as DiscordBotPanelPayload & {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(data.error || "Erro ao carregar painel do bot.");
    }

    setSettings(data.settings);
    setLogs(data.recentLogs);
    setEnvironment(data.environment);
    setInviteUrl(data.environment.inviteUrl);
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

        await fetchPanel();
        setLoading(false);
      } catch (error) {
        console.error("Erro ao carregar painel Discord:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Falha ao carregar painel."
        );
        setLoading(false);
      }
    });

    return () => unsub();
  }, [fetchPanel, router]);

  const handleChange = (
    field: keyof DiscordBotSettings,
    value: string | boolean
  ) => {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveSettings = async () => {
    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        router.push("/");
        return;
      }

      setSaving(true);
      setFeedback(null);
      setErrorMessage(null);

      const token = await currentUser.getIdToken();
      const response = await fetch("/api/admin/discord-bot", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      const data = (await response.json()) as {
        error?: string;
        inviteUrl?: string | null;
        settings?: DiscordBotSettings;
      };

      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar configuracoes.");
      }

      if (data.settings) {
        setSettings(data.settings);
      }

      setInviteUrl(data.inviteUrl ?? null);
      setFeedback("Configuracoes salvas com sucesso.");
      await fetchPanel();
    } catch (error) {
      console.error("Erro ao salvar configuracoes Discord:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Nao foi possivel salvar."
      );
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action: BotAction) => {
    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        router.push("/");
        return;
      }

      setRunningAction(action);
      setFeedback(null);
      setErrorMessage(null);

      const token = await currentUser.getIdToken();
      const response = await fetch("/api/admin/discord-bot/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Erro ao executar operacao.");
      }

      setFeedback(data.message || "Operacao concluida.");
      await fetchPanel();
    } catch (error) {
      console.error("Erro ao executar acao Discord:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Falha ao executar operacao."
      );
    } finally {
      setRunningAction(null);
    }
  };

  const connectionCards = useMemo(
    () => [
      {
        label: "Token do bot",
        value: environment.hasBotToken ? "Configurado" : "Ausente",
        active: environment.hasBotToken,
      },
      {
        label: "Public key",
        value: environment.hasPublicKey ? "Configurada" : "Ausente",
        active: environment.hasPublicKey,
      },
      {
        label: "Client secret",
        value: environment.hasClientSecret ? "Configurado" : "Ausente",
        active: environment.hasClientSecret,
      },
      {
        label: "Aplicacao Discord",
        value:
          settings.botClientId ||
          environment.clientIdFromEnv ||
          "Sem client ID",
        active: Boolean(settings.botClientId || environment.clientIdFromEnv),
      },
    ],
    [environment, settings.botClientId]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent text-white">
        Carregando controle do bot...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent px-6 py-16 text-white flex justify-center">
      <div className="w-full max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <button
              onClick={() => router.push("/admin")}
              className="mb-5 text-sm text-gray-400 transition hover:text-red-400"
            >
              Voltar para Admin
            </button>

            <h1 className="text-4xl font-bold text-red-500 drop-shadow-[0_0_20px_rgba(255,0,0,0.7)]">
              Controle do Bot Discord
            </h1>

            <p className="mt-3 max-w-3xl text-gray-300">
              Configure o bot, vincule o servidor e acompanhe operacoes
              administrativas sem sair do site.
            </p>
          </div>

          {inviteUrl ? (
            <a
              href={inviteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-red-700 bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-500"
            >
              Convidar bot para o servidor
            </a>
          ) : (
            <div className="rounded-xl border border-red-900 bg-[#120808] px-5 py-3 text-sm text-gray-300">
              Preencha o Client ID para gerar o convite do bot.
            </div>
          )}
        </div>

        {(feedback || errorMessage) && (
          <div
            className={`rounded-2xl border px-5 py-4 text-sm ${
              errorMessage
                ? "border-red-700 bg-red-950/40 text-red-200"
                : "border-emerald-700 bg-emerald-950/30 text-emerald-200"
            }`}
          >
            {errorMessage || feedback}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {connectionCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-2xl border p-5 ${statusTone(card.active)}`}
            >
              <p className="text-xs uppercase tracking-[0.25em] opacity-80">
                {card.label}
              </p>
              <p className="mt-3 text-lg font-semibold">{card.value}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-8 xl:grid-cols-[1.35fr_0.9fr]">
          <section className="rounded-[28px] border border-red-950 bg-[#0d0d0d]/95 p-6 shadow-[0_0_40px_rgba(120,0,0,0.2)]">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-red-400">
                  Configuracoes
                </h2>
                <p className="mt-2 text-sm text-gray-400">
                  Estes dados ficam salvos no Firestore para o site e o worker
                  do bot compartilharem a mesma configuracao.
                </p>
              </div>

              <label className="inline-flex items-center gap-3 rounded-full border border-red-900 bg-[#130808] px-4 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(event) =>
                    handleChange("enabled", event.target.checked)
                  }
                  className="h-4 w-4 accent-red-600"
                />
                Bot habilitado
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-gray-300">Guild ID</span>
                <input
                  value={settings.guildId}
                  onChange={(event) =>
                    handleChange("guildId", event.target.value)
                  }
                  className="w-full rounded-xl border border-red-950 bg-[#140c0c] px-4 py-3 outline-none transition focus:border-red-500"
                  placeholder="ID do servidor Discord"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-gray-300">Nome da guild</span>
                <input
                  value={settings.guildName}
                  onChange={(event) =>
                    handleChange("guildName", event.target.value)
                  }
                  className="w-full rounded-xl border border-red-950 bg-[#140c0c] px-4 py-3 outline-none transition focus:border-red-500"
                  placeholder="Capivaros Templarios"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-gray-300">Client ID do bot</span>
                <input
                  value={settings.botClientId}
                  onChange={(event) =>
                    handleChange("botClientId", event.target.value)
                  }
                  className="w-full rounded-xl border border-red-950 bg-[#140c0c] px-4 py-3 outline-none transition focus:border-red-500"
                  placeholder="Application ID do Discord"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-gray-300">Username do bot</span>
                <input
                  value={settings.botUsername}
                  onChange={(event) =>
                    handleChange("botUsername", event.target.value)
                  }
                  className="w-full rounded-xl border border-red-950 bg-[#140c0c] px-4 py-3 outline-none transition focus:border-red-500"
                  placeholder="CapiBot"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-gray-300">
                  Canal padrao para avisos
                </span>
                <input
                  value={settings.defaultChannelId}
                  onChange={(event) =>
                    handleChange("defaultChannelId", event.target.value)
                  }
                  className="w-full rounded-xl border border-red-950 bg-[#140c0c] px-4 py-3 outline-none transition focus:border-red-500"
                  placeholder="ID do canal principal"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-gray-300">Canal de logs</span>
                <input
                  value={settings.logChannelId}
                  onChange={(event) =>
                    handleChange("logChannelId", event.target.value)
                  }
                  className="w-full rounded-xl border border-red-950 bg-[#140c0c] px-4 py-3 outline-none transition focus:border-red-500"
                  placeholder="ID do canal de auditoria"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-gray-300">
                  Cargo moderador vinculado
                </span>
                <input
                  value={settings.moderatorRoleId}
                  onChange={(event) =>
                    handleChange("moderatorRoleId", event.target.value)
                  }
                  className="w-full rounded-xl border border-red-950 bg-[#140c0c] px-4 py-3 outline-none transition focus:border-red-500"
                  placeholder="Role ID para comandos administrativos"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-gray-300">
                  Mensagem de boas-vindas
                </span>
                <textarea
                  value={settings.welcomeMessage}
                  onChange={(event) =>
                    handleChange("welcomeMessage", event.target.value)
                  }
                  rows={5}
                  className="w-full rounded-2xl border border-red-950 bg-[#140c0c] px-4 py-3 outline-none transition focus:border-red-500"
                  placeholder="Mensagem usada em onboarding no Discord"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-400">
                Ultima atualizacao: {formatDate(settings.updatedAt)}
              </div>

              <button
                onClick={saveSettings}
                disabled={saving}
                className="rounded-xl bg-red-700 px-5 py-3 font-semibold transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Salvando..." : "Salvar configuracoes"}
              </button>
            </div>
          </section>

          <section className="space-y-8">
            <div className="rounded-[28px] border border-red-950 bg-[#0d0d0d]/95 p-6">
              <h2 className="text-2xl font-bold text-red-400">
                Operacoes rapidas
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                Use estes controles para registrar a saude do bot e as ultimas
                acoes executadas pelo time.
              </p>

              <div className="mt-6 grid gap-3">
                <button
                  onClick={() => runAction("heartbeat")}
                  disabled={runningAction !== null}
                  className="rounded-xl border border-red-800 bg-[#170909] px-4 py-3 text-left transition hover:border-red-500 disabled:opacity-60"
                >
                  {runningAction === "heartbeat"
                    ? "Registrando heartbeat..."
                    : "Registrar heartbeat"}
                </button>

                <button
                  onClick={() => runAction("sync_commands")}
                  disabled={runningAction !== null}
                  className="rounded-xl border border-red-800 bg-[#170909] px-4 py-3 text-left transition hover:border-red-500 disabled:opacity-60"
                >
                  {runningAction === "sync_commands"
                    ? "Marcando sincronizacao..."
                    : "Marcar sync de comandos"}
                </button>

                <button
                  onClick={() => runAction("test_message")}
                  disabled={runningAction !== null}
                  className="rounded-xl border border-red-800 bg-[#170909] px-4 py-3 text-left transition hover:border-red-500 disabled:opacity-60"
                >
                  {runningAction === "test_message"
                    ? "Registrando teste..."
                    : "Registrar teste operacional"}
                </button>
              </div>

              <div className="mt-6 space-y-3 rounded-2xl border border-red-950 bg-[#140909] p-4 text-sm text-gray-300">
                <div>
                  Ultimo heartbeat:{" "}
                  <span className="text-white">
                    {formatDate(settings.lastHeartbeatAt)}
                  </span>
                </div>
                <div>
                  Ultimo sync de comandos:{" "}
                  <span className="text-white">
                    {formatDate(settings.commandsLastSyncedAt)}
                  </span>
                </div>
                <div>
                  Ultimo teste operacional:{" "}
                  <span className="text-white">
                    {formatDate(settings.testMessageAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-red-950 bg-[#0d0d0d]/95 p-6">
              <h2 className="text-2xl font-bold text-red-400">
                Ultimas atividades
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                Historico rapido para acompanhar quem mexeu no bot pelo painel.
              </p>

              <div className="mt-6 space-y-3">
                {logs.length === 0 ? (
                  <div className="rounded-2xl border border-red-950 bg-[#140909] p-4 text-sm text-gray-400">
                    Nenhuma atividade registrada ainda.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-red-950 bg-[#140909] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-white">
                            {log.message}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-red-300">
                            {log.action}
                          </p>
                        </div>

                        <span className="text-xs text-gray-500">
                          {formatDate(log.performedAt)}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-gray-400">
                        Responsavel: {log.performedBy}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
