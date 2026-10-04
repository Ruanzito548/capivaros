import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canCreateNews } from "@/lib/permissions";
import {
  defaultDiscordBotSettings,
  normalizeDiscordBotSettings,
} from "@/lib/discord-bot-admin";

export const runtime = "nodejs";

function serializeNews(doc: FirebaseFirestore.QueryDocumentSnapshot) {
  const data = doc.data();
  const createdAt = data.createdAt;

  return {
    id: doc.id,
    ...data,
    createdAt:
      typeof createdAt?.toMillis === "function" ? createdAt.toMillis() : null,
  };
}

type DiscordNotificationResult = {
  status: "sent" | "skipped" | "failed";
  message: string;
};

function getHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function getYoutubeThumbnailUrl(value: string) {
  try {
    const url = new URL(value);
    let videoId: string | null = null;

    if (url.hostname === "youtu.be") {
      videoId = url.pathname.split("/")[1] ?? null;
    } else if (
      url.hostname === "youtube.com" ||
      url.hostname.endsWith(".youtube.com")
    ) {
      videoId = url.searchParams.get("v");

      if (!videoId) {
        const [pathType, pathVideoId] = url.pathname.split("/").slice(1);
        if (["embed", "shorts", "live"].includes(pathType)) {
          videoId = pathVideoId ?? null;
        }
      }
    }

    return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : null;
  } catch {
    return null;
  }
}

async function sendNewsToDiscord(
  request: NextRequest,
  newsId: string,
  news: { title: string; content: string; image: string; video: string }
): Promise<DiscordNotificationResult> {
  const settingsSnapshot = await adminDb
    .collection("adminSettings")
    .doc("discordBot")
    .get();
  const settings = settingsSnapshot.exists
    ? normalizeDiscordBotSettings(settingsSnapshot.data())
    : defaultDiscordBotSettings;
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim();

  if (!settings.enabled) {
    return { status: "skipped", message: "O bot esta desabilitado no painel." };
  }

  if (!botToken) {
    return { status: "skipped", message: "DISCORD_BOT_TOKEN nao esta configurado." };
  }

  if (!settings.guildNewsChannelId) {
    return { status: "skipped", message: "Configure o canal de noticias da guilda." };
  }

  const description = news.content.length > 4000
    ? `${news.content.slice(0, 3997)}...`
    : news.content;
  const embed: Record<string, unknown> = {
    title: news.title.slice(0, 256),
    description,
    url: new URL(`/news/${newsId}`, request.nextUrl.origin).href,
    color: 0xd92d20,
    timestamp: new Date().toISOString(),
    footer: { text: (settings.guildName || "Capivaros").slice(0, 256) },
  };
  const imageUrl = getHttpUrl(news.image);
  if (imageUrl) {
    embed.image = { url: imageUrl };
  }

  const videoUrl = getHttpUrl(news.video);
  if (videoUrl) {
    embed.fields = [{ name: "Video", value: `[Assistir](${videoUrl})` }];
  }
  const videoThumbnailUrl = getYoutubeThumbnailUrl(news.video);
  if (videoThumbnailUrl) {
    embed.thumbnail = { url: videoThumbnailUrl };
  }

  const response = await fetch(
    `https://discord.com/api/v10/channels/${encodeURIComponent(settings.guildNewsChannelId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...(videoUrl ? { content: videoUrl } : {}),
        embeds: [embed],
        allowed_mentions: { parse: [] },
      }),
      signal: AbortSignal.timeout(8000),
    }
  );

  if (!response.ok) {
    return {
      status: "failed",
      message: `O Discord recusou o envio (HTTP ${response.status}).`,
    };
  }

  return { status: "sent", message: "Noticia enviada ao Discord." };
}

async function authenticateNewsPublisher(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userSnapshot = await adminDb.collection("users").doc(decodedToken.uid).get();

    if (!canCreateNews(userSnapshot.data()?.role ?? null)) {
      return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }

    return { decodedToken };
  } catch {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
}

export async function POST(request: NextRequest) {
  const authResult = await authenticateNewsPublisher(request);
  if ("error" in authResult) {
    return authResult.error;
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const image = typeof body.image === "string" ? body.image.trim() : "";
    const video = typeof body.video === "string" ? body.video.trim() : "";

    if (!title || !content) {
      return NextResponse.json(
        { error: "Titulo e conteudo sao obrigatorios." },
        { status: 400 }
      );
    }

    const newsDocument = await adminDb.collection("news").add({
      title,
      content,
      image,
      video,
      createdAt: new Date(),
    });

    let discordNotification: DiscordNotificationResult;
    try {
      discordNotification = await sendNewsToDiscord(request, newsDocument.id, {
        title,
        content,
        image,
        video,
      });
    } catch {
      discordNotification = {
        status: "failed",
        message: "Nao foi possivel conectar ao Discord.",
      };
    }

    try {
      await adminDb.collection("discordBotLogs").add({
        action: `news_${discordNotification.status}`,
        message: `${discordNotification.message} Titulo: ${title.slice(0, 180)}`,
        performedAt: Date.now(),
        performedBy:
          authResult.decodedToken.name ||
          authResult.decodedToken.email ||
          authResult.decodedToken.uid,
      });
    } catch {
      // A falha ao registrar atividade nao deve desfazer a publicacao.
    }

    return NextResponse.json(
      { id: newsDocument.id, discordNotification },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create news", message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const requestedLimit = limitParam ? Number(limitParam) : 3;
  const newsLimit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? requestedLimit
    : 3;

  try {
    const snapshot = await adminDb
      .collection("news")
      .orderBy("createdAt", "desc")
      .limit(newsLimit)
      .get();

    const news = snapshot.docs.map(serializeNews);

    return NextResponse.json(news);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to fetch news",
        message,
      },
      { status: 500 }
    );
  }
}
