import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canManageRoles } from "@/lib/permissions";
import {
  defaultDiscordBotSettings,
  normalizeDiscordBotSettings,
} from "@/lib/discord-bot-admin";

export const runtime = "nodejs";

const SETTINGS_COLLECTION = "adminSettings";
const SETTINGS_DOC = "discordBot";
const LOGS_COLLECTION = "discordBotLogs";

type DiscordAdminAction =
  | "heartbeat"
  | "sync_commands"
  | "test_message";

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

export async function POST(request: NextRequest) {
  const decodedToken = await getAuthenticatedUser(request);

  if (!decodedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminUserSnap = await adminDb.collection("users").doc(decodedToken.uid).get();
    const adminRole = adminUserSnap.data()?.role;

    if (!canManageRoles(adminRole ?? null)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as { action?: DiscordAdminAction };
    const action = body.action;

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    const settingsRef = adminDb.collection(SETTINGS_COLLECTION).doc(SETTINGS_DOC);
    const settingsSnap = await settingsRef.get();
    const settings = settingsSnap.exists
      ? normalizeDiscordBotSettings(settingsSnap.data())
      : defaultDiscordBotSettings;

    const now = Date.now();
    const performedBy =
      decodedToken.name || decodedToken.email || decodedToken.uid;

    let nextSettings = settings;
    let message = "";

    if (action === "heartbeat") {
      nextSettings = {
        ...settings,
        lastHeartbeatAt: now,
        updatedAt: now,
        updatedBy: performedBy,
      };
      message = "Heartbeat administrativo registrado com sucesso.";
    } else if (action === "sync_commands") {
      nextSettings = {
        ...settings,
        commandsLastSyncedAt: now,
        updatedAt: now,
        updatedBy: performedBy,
      };
      message = "Sincronizacao de comandos marcada pelo painel.";
    } else if (action === "test_message") {
      nextSettings = {
        ...settings,
        testMessageAt: now,
        updatedAt: now,
        updatedBy: performedBy,
      };
      message =
        "Teste operacional registrado. Agora voce pode conectar esta acao ao processo do bot.";
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await Promise.all([
      settingsRef.set(nextSettings),
      adminDb.collection(LOGS_COLLECTION).add({
        action,
        message,
        performedAt: now,
        performedBy,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message,
      settings: nextSettings,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      { error: "Failed to execute discord bot action", message },
      { status: 500 }
    );
  }
}
