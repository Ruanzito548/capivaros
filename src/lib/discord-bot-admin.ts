export interface DiscordBotSettings {
  enabled: boolean;
  guildId: string;
  guildName: string;
  defaultChannelId: string;
  logChannelId: string;
  moderatorRoleId: string;
  botClientId: string;
  botUsername: string;
  welcomeMessage: string;
  commandsLastSyncedAt: number | null;
  lastHeartbeatAt: number | null;
  testMessageAt: number | null;
  updatedAt: number | null;
  updatedBy: string | null;
}

export interface DiscordBotLogEntry {
  id: string;
  action: string;
  message: string;
  performedAt: number;
  performedBy: string;
}

export interface DiscordBotPanelPayload {
  settings: DiscordBotSettings;
  environment: {
    hasBotToken: boolean;
    hasPublicKey: boolean;
    hasClientSecret: boolean;
    clientIdFromEnv: string | null;
    inviteUrl: string | null;
  };
  recentLogs: DiscordBotLogEntry[];
}

export const defaultDiscordBotSettings: DiscordBotSettings = {
  enabled: false,
  guildId: "",
  guildName: "",
  defaultChannelId: "",
  logChannelId: "",
  moderatorRoleId: "",
  botClientId: "",
  botUsername: "",
  welcomeMessage:
    "Bem-vindo ao servidor dos Capivaros Templarios. Fique de olho nas regras e canais oficiais.",
  commandsLastSyncedAt: null,
  lastHeartbeatAt: null,
  testMessageAt: null,
  updatedAt: null,
  updatedBy: null,
};

function toTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNullableTimestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function normalizeDiscordBotSettings(
  value: unknown
): DiscordBotSettings {
  const data =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    enabled:
      typeof data.enabled === "boolean"
        ? data.enabled
        : defaultDiscordBotSettings.enabled,
    guildId: toTrimmedString(data.guildId),
    guildName: toTrimmedString(data.guildName),
    defaultChannelId: toTrimmedString(data.defaultChannelId),
    logChannelId: toTrimmedString(data.logChannelId),
    moderatorRoleId: toTrimmedString(data.moderatorRoleId),
    botClientId: toTrimmedString(data.botClientId),
    botUsername: toTrimmedString(data.botUsername),
    welcomeMessage:
      toTrimmedString(data.welcomeMessage) ||
      defaultDiscordBotSettings.welcomeMessage,
    commandsLastSyncedAt: toNullableTimestamp(data.commandsLastSyncedAt),
    lastHeartbeatAt: toNullableTimestamp(data.lastHeartbeatAt),
    testMessageAt: toNullableTimestamp(data.testMessageAt),
    updatedAt: toNullableTimestamp(data.updatedAt),
    updatedBy: toTrimmedString(data.updatedBy) || null,
  };
}

export function buildDiscordInviteUrl(clientId: string, guildId?: string) {
  if (!clientId) {
    return null;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    scope: "bot applications.commands",
    permissions: "274878221376",
  });

  if (guildId) {
    params.set("guild_id", guildId);
    params.set("disable_guild_select", "true");
  }

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
