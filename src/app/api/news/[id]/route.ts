import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canCreateNews } from "@/lib/permissions";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const snapshot = await adminDb.collection("news").doc(id).get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { error: "News not found" },
        { status: 404 }
      );
    }

    const data = snapshot.data();
    const createdAt = data?.createdAt;

    return NextResponse.json({
      id: snapshot.id,
      ...data,
      createdAt:
        typeof createdAt?.toMillis === "function"
          ? createdAt.toMillis()
          : null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to fetch news item",
        message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userSnapshot = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    if (!canCreateNews(userSnapshot.data()?.role ?? null)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const newsRef = adminDb.collection("news").doc(id);
    const newsSnapshot = await newsRef.get();

    if (!newsSnapshot.exists) {
      return NextResponse.json({ error: "News not found" }, { status: 404 });
    }

    const discordMessages = newsSnapshot.data()?.discordMessages as
      | { channelId?: unknown; messageIds?: unknown }
      | undefined;
    const channelId =
      typeof discordMessages?.channelId === "string"
        ? discordMessages.channelId
        : "";
    const messageIds = Array.isArray(discordMessages?.messageIds)
      ? discordMessages.messageIds.filter(
          (messageId): messageId is string => typeof messageId === "string"
        )
      : [];

    if (channelId && messageIds.length > 0) {
      const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
      if (!botToken) {
        return NextResponse.json(
          { error: "DISCORD_BOT_TOKEN is not configured; news was not deleted." },
          { status: 503 }
        );
      }

      for (const messageId of messageIds) {
        const discordResponse = await fetch(
          `https://discord.com/api/v10/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bot ${botToken}` },
            signal: AbortSignal.timeout(8000),
          }
        );

        if (!discordResponse.ok && discordResponse.status !== 404) {
          return NextResponse.json(
            {
              error: `Discord rejected message deletion (HTTP ${discordResponse.status}); news was not deleted.`,
            },
            { status: 502 }
          );
        }
      }
    }

    await newsRef.delete();

    return NextResponse.json({
      success: true,
      discordDeletion:
        channelId && messageIds.length > 0 ? "deleted" : "not_tracked",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to delete news", message },
      { status: 500 }
    );
  }
}
