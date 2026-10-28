import { adminDb } from "@/lib/firebase-admin";

export const DISCORD_STATE_COOKIE = "discord_oauth_state";
export const DISCORD_NEXT_COOKIE = "discord_oauth_next";

export const DISCORD_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api/auth/discord",
  maxAge: 600,
};

// Usa a variavel de ambiente e, se ausente, o Client ID salvo no painel do bot.
export async function getDiscordClientId(): Promise<string | null> {
  const fromEnv = process.env.DISCORD_CLIENT_ID?.trim();
  if (fromEnv) return fromEnv;

  const snapshot = await adminDb.collection("adminSettings").doc("discordBot").get();
  const fromSettings = snapshot.data()?.botClientId;

  return typeof fromSettings === "string" && fromSettings.trim() ? fromSettings.trim() : null;
}
