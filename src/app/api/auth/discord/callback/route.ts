import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  DISCORD_COOKIE_OPTIONS,
  DISCORD_NEXT_COOKIE,
  DISCORD_STATE_COOKIE,
  getDiscordClientId,
} from "@/lib/discord-oauth-server";
import { getSafeNextPath } from "@/lib/safe-next-path";

export const runtime = "nodejs";

interface DiscordProfile {
  id: string;
  username: string;
  global_name?: string | null;
  email?: string | null;
  verified?: boolean;
}

function statesMatch(received: string, saved: string) {
  const a = Buffer.from(received);
  const b = Buffer.from(saved);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Reaproveita contas antigas (Google) quando o e-mail verificado do Discord coincide.
async function resolveUserId(profile: DiscordProfile) {
  const users = adminDb.collection("users");

  const byDiscordId = await users.where("discordId", "==", profile.id).limit(1).get();
  if (!byDiscordId.empty) return byDiscordId.docs[0].id;

  const email = profile.email?.trim().toLowerCase();
  if (email && profile.verified) {
    const byEmail = await users.where("email", "==", email).limit(1).get();
    const existing = byEmail.docs[0];
    const linkedDiscordId = existing?.data().discordId;

    if (existing && (!linkedDiscordId || linkedDiscordId === profile.id)) {
      return existing.id;
    }
  }

  return `discord-${profile.id}`;
}

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;

  const fail = (reason: string) => {
    const response = NextResponse.redirect(new URL(`/login?error=${reason}`, origin));
    response.cookies.delete({ name: DISCORD_STATE_COOKIE, path: DISCORD_COOKIE_OPTIONS.path });
    response.cookies.delete({ name: DISCORD_NEXT_COOKIE, path: DISCORD_COOKIE_OPTIONS.path });
    return response;
  };

  try {
    if (searchParams.get("error")) return fail("cancelled");

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const savedState = request.cookies.get(DISCORD_STATE_COOKIE)?.value;

    if (!code || !state || !savedState || !statesMatch(state, savedState)) {
      return fail("state");
    }

    const clientId = await getDiscordClientId();
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    if (!clientId || !clientSecret) return fail("config");

    const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${origin}/api/auth/discord/callback`,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!tokenResponse.ok) return fail("token");

    const { access_token: accessToken } = (await tokenResponse.json()) as {
      access_token?: string;
    };
    if (!accessToken) return fail("token");

    const profileResponse = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!profileResponse.ok) return fail("profile");

    const profile = (await profileResponse.json()) as DiscordProfile;
    const uid = await resolveUserId(profile);
    const userRef = adminDb.collection("users").doc(uid);
    const existing = await userRef.get();
    const displayName = profile.global_name || profile.username;
    const discordFields = { discordId: profile.id, discordUsername: profile.username };

    if (existing.exists) {
      await userRef.set(discordFields, { merge: true });
    } else {
      await userRef.set({
        ...discordFields,
        name: displayName,
        email: profile.email?.toLowerCase() ?? null,
        role: "member",
        createdAt: new Date(),
      });
    }

    const customToken = await adminAuth.createCustomToken(uid);
    const next = getSafeNextPath(request.cookies.get(DISCORD_NEXT_COOKIE)?.value);
    const target = new URL("/login/callback", origin);
    if (next) target.searchParams.set("next", next);

    // O token vai no fragmento da URL para nao aparecer em logs de servidor.
    const response = NextResponse.redirect(`${target.toString()}#token=${customToken}`);
    response.cookies.delete({ name: DISCORD_STATE_COOKIE, path: DISCORD_COOKIE_OPTIONS.path });
    response.cookies.delete({ name: DISCORD_NEXT_COOKIE, path: DISCORD_COOKIE_OPTIONS.path });
    return response;
  } catch (error) {
    console.error("Discord login failed:", error);
    return fail("server");
  }
}
