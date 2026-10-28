import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  DISCORD_COOKIE_OPTIONS,
  DISCORD_NEXT_COOKIE,
  DISCORD_STATE_COOKIE,
  getDiscordClientId,
} from "@/lib/discord-oauth-server";
import { getSafeNextPath } from "@/lib/safe-next-path";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;

  try {
    const clientId = await getDiscordClientId();
    if (!clientId || !process.env.DISCORD_CLIENT_SECRET) {
      return NextResponse.redirect(new URL("/login?error=config", origin));
    }

    const state = randomBytes(16).toString("hex");
    const authorizeUrl = new URL("https://discord.com/oauth2/authorize");
    authorizeUrl.search = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: `${origin}/api/auth/discord/callback`,
      scope: "identify email",
      state,
    }).toString();

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(DISCORD_STATE_COOKIE, state, DISCORD_COOKIE_OPTIONS);
    response.cookies.set(
      DISCORD_NEXT_COOKIE,
      getSafeNextPath(searchParams.get("next")) ?? "",
      DISCORD_COOKIE_OPTIONS
    );

    return response;
  } catch (error) {
    console.error("Discord login start failed:", error);
    return NextResponse.redirect(new URL("/login?error=server", origin));
  }
}
