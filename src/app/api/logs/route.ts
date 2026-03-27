import { NextResponse } from "next/server";

export const runtime = "nodejs";

let cachedToken: string | null = null;
let tokenExpires = 0;
const WCL_GRAPHQL_ENDPOINTS = [
  "https://www.warcraftlogs.com/api/v2/client",
  "https://fresh.warcraftlogs.com/api/v2/client",
];

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

  console.log("WCL token response:", {
    ok: tokenRes.ok,
    status: tokenRes.status,
    hasAccessToken: Boolean(tokenData.access_token),
    error: tokenData.error ?? null,
    errorDescription: tokenData.error_description ?? null,
  });

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
    console.log("WCL logs request:", {
      name,
      server,
      region,
      zone,
    });

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

    let logsData: unknown = null;
    let lastErrorMessage = "Warcraft Logs request failed";

    for (const endpoint of WCL_GRAPHQL_ENDPOINTS) {
      try {
        const logsRes = await fetch(endpoint, {
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

        if (!logsRes.ok) {
          lastErrorMessage = `Warcraft Logs HTTP ${logsRes.status} on ${endpoint}`;
          console.error("WCL endpoint HTTP failure:", {
            endpoint,
            status: logsRes.status,
            statusText: logsRes.statusText,
          });
          continue;
        }

        const candidateData = (await logsRes.json()) as {
          errors?: unknown;
          data?: unknown;
        };

        if (candidateData.errors) {
          lastErrorMessage = `Warcraft Logs GraphQL error on ${endpoint}`;
          console.error("WCL GraphQL errors:", {
            endpoint,
            errors: candidateData.errors,
          });
          continue;
        }

        console.log("WCL endpoint success:", {
          endpoint,
          hasData: Boolean(candidateData.data),
        });
        logsData = candidateData;
        break;
      } catch (endpointError) {
        lastErrorMessage =
          endpointError instanceof Error
            ? endpointError.message
            : "Unknown Warcraft Logs error";
        console.error("WCL endpoint exception:", {
          endpoint,
          message: lastErrorMessage,
        });
      }
    }

    if (!logsData) {
      console.error("WCL logs request failed after all endpoints:", {
        name,
        server,
        region,
        zone,
        lastErrorMessage,
      });
      throw new Error(lastErrorMessage);
    }

    const parsedLogsData = logsData as {
      data?: {
        characterData?: {
          character?: {
            name?: string;
            classID?: number | null;
            zoneRankings?: {
              bestPerformanceAverage?: number;
              medianPerformanceAverage?: number;
              totalKills?: number;
            };
          } | null;
        };
      };
    };

    const character = parsedLogsData.data?.characterData?.character;
    console.log("WCL character result:", {
      requestedName: name,
      server,
      region,
      zone,
      found: Boolean(character),
      returnedName: character?.name ?? null,
    });

    return NextResponse.json(
      character
        ? {
            name: character.name ?? null,
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
          }
    );
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
