import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const LOGS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface LogsPayload {
  name: string | null;
  classID: number | null;
  percent: number;
  median: number;
  kills: number;
}

function getLogsCacheKey({
  name,
  server,
  region,
  zone,
}: {
  name: string;
  server: string;
  region: string;
  zone: string;
}) {
  return Buffer.from(
    JSON.stringify({
      name: name.trim().toLowerCase(),
      server: server.trim().toLowerCase(),
      region: region.trim().toUpperCase(),
      zone,
    })
  ).toString("base64url");
}

let cachedToken: string | null = null;
let tokenExpires = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpires) {
    return cachedToken;
  }

  const tokenRes = await fetch("https://www.warcraftlogs.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.WCL_CLIENT_ID!,
      client_secret: process.env.WCL_CLIENT_SECRET!,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    throw new Error("Failed to obtain WarcraftLogs token");
  }

  cachedToken = tokenData.access_token;
  tokenExpires = Date.now() + 3600 * 1000;

  return cachedToken;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const name = searchParams.get("name");
  const server = searchParams.get("server");
  let region = searchParams.get("region") ?? "US";
  const zone = searchParams.get("zone") ?? "1047";

  if (!name || !server) {
    return NextResponse.json(
      { error: "Missing name or server parameter" },
      { status: 400 }
    );
  }

  if (region === "NA") region = "US";

  try {
    const cacheKey = getLogsCacheKey({ name, server, region, zone });
    const cacheRef = adminDb.collection("logsCache").doc(cacheKey);
    const cacheSnap = await cacheRef.get();
    const cacheData = cacheSnap.data();

    if (
      cacheData &&
      typeof cacheData.fetchedAt === "number" &&
      Date.now() - cacheData.fetchedAt < LOGS_CACHE_TTL_MS
    ) {
      return NextResponse.json(cacheData.payload);
    }

    const accessToken = await getAccessToken();

    const query = `
      query CharacterData($name: String!, $server: String!, $region: String!) {
        characterData {
          character(
            name: $name,
            serverSlug: $server,
            serverRegion: $region
          ) {
            name
            classID
            zoneRankings(
              zoneID: ${zone},
              partition: 1,
              difficulty: 3
            )
          }
        }
      }
    `;

    const logsRes = await fetch("https://fresh.warcraftlogs.com/api/v2/client", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          name,
          server,
          region,
        },
      }),
    });

    const logsData = await logsRes.json();

    if (logsData.errors) {
      return NextResponse.json(
        { error: "GraphQL error", details: logsData.errors },
        { status: 500 }
      );
    }

    const character = logsData?.data?.characterData?.character;

    const payload: LogsPayload = character
      ? {
          name: character.name,
          classID: character.classID ?? null,
          percent: character.zoneRankings?.bestPerformanceAverage ?? 0,
          median: character.zoneRankings?.medianPerformanceAverage ?? 0,
          kills: character.zoneRankings?.totalKills ?? 0,
        }
      : {
          name: null,
          classID: null,
          percent: 0,
          median: 0,
          kills: 0,
        };

    await cacheRef.set({
      fetchedAt: Date.now(),
      payload,
    });

    return NextResponse.json(payload);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Unexpected server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
