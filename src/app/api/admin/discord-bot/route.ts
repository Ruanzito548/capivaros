import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canManageRoles } from "@/lib/permissions";
import {
  buildDiscordInviteUrl,
  defaultDiscordBotSettings,
  normalizeDiscordBotSettings,
} from "@/lib/discord-bot-admin";

export const runtime = "nodejs";

const SETTINGS_COLLECTION = "adminSettings";
const SETTINGS_DOC = "discordBot";
const LOGS_COLLECTION = "discordBotLogs";

async function getAuthenticatedUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    return null;
  }

  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    return null;
  }
}

async function assertAdmin(request: NextRequest) {
  const decodedToken = await getAuthenticatedUser(request);

  if (!decodedToken) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const adminUserSnap = await adminDb.collection("users").doc(decodedToken.uid).get();
  const adminRole = adminUserSnap.data()?.role;

  if (!canManageRoles(adminRole ?? null)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { decodedToken };
}

export async function GET(request: NextRequest) {
  const authResult = await assertAdmin(request);

  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const settingsRef = adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC);
    const [settingsSnap, logsSnap] = await Promise.all([
      settingsRef.get(),
      adminDb
        .collection(LOGS_COLLECTION)
        .orderBy("performedAt", "desc")
        .limit(8)
        .get(),
    ]);

    const settings = settingsSnap.exists
      ? normalizeDiscordBotSettings(settingsSnap.data())
      : defaultDiscordBotSettings;

    const clientIdFromEnv = process.env.DISCORD_CLIENT_ID?.trim() || null;
    const effectiveClientId = settings.botClientId || clientIdFromEnv || "";

    const recentLogs = logsSnap.docs.map((docSnap) => {
      const data = docSnap.data();

      return {
        id: docSnap.id,
        action: typeof data.action === "string" ? data.action : "unknown",
        message: typeof data.message === "string" ? data.message : "Sem descricao",
        performedAt:
          typeof data.performedAt === "number" ? data.performedAt : Date.now(),
        performedBy:
          typeof data.performedBy === "string"
            ? data.performedBy
            : "Administrador",
      };
    });

    return NextResponse.json({
      settings,
      environment: {
        hasBotToken: Boolean(process.env.DISCORD_BOT_TOKEN),
        hasPublicKey: Boolean(process.env.DISCORD_PUBLIC_KEY),
        hasClientSecret: Boolean(process.env.DISCORD_CLIENT_SECRET),
        clientIdFromEnv,
        inviteUrl: buildDiscordInviteUrl(effectiveClientId, settings.guildId),
      },
      recentLogs,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to load discord bot panel", message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await assertAdmin(request);

  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const body = await request.json();
    const settings = normalizeDiscordBotSettings(body);
    const now = Date.now();

    const payload = {
      ...settings,
      updatedAt: now,
      updatedBy:
        authResult.decodedToken.name ||
        authResult.decodedToken.email ||
        authResult.decodedToken.uid,
    };

    await Promise.all([
      adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC).set(payload),
      adminDb.collection(LOGS_COLLECTION).add({
        action: "settings_updated",
        message: "Configuracoes do bot atualizadas pelo painel admin.",
        performedAt: now,
        performedBy: payload.updatedBy,
      }),
    ]);

    return NextResponse.json({
      success: true,
      settings: payload,
      inviteUrl: buildDiscordInviteUrl(
        payload.botClientId || process.env.DISCORD_CLIENT_ID?.trim() || "",
        payload.guildId
      ),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to save discord bot settings", message },
      { status: 500 }
    );
  }
}
