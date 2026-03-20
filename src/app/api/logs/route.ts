import { NextResponse } from "next/server";

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

    const logsRes = await fetch(
      "https://fresh.warcraftlogs.com/api/v2/client",
      {
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
      }
    );

    const logsData = await logsRes.json();

    if (logsData.errors) {
      return NextResponse.json(
        { error: "GraphQL error", details: logsData.errors },
        { status: 500 }
      );
    }

    const character = logsData?.data?.characterData?.character;

    if (!character) {
      return NextResponse.json({ character: null });
    }

    const rankings = character.zoneRankings ?? {};

    return NextResponse.json({
      name: character.name,
      classID: character.classID,
      percent: rankings.bestPerformanceAverage ?? 0,
      median: rankings.medianPerformanceAverage ?? 0,
      kills: rankings.totalKills ?? 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Unexpected server error",
        message: error?.message,
      },
      { status: 500 }
    );
  }
}