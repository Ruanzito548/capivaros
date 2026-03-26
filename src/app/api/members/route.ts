import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

type GameType = "lol" | "wowtbc";

interface MemberResponse {
  id: string;
  username: string;
  role: string;
  photoURL?: string;
}

function isApprovedForGame(
  game: GameType,
  data: FirebaseFirestore.DocumentData
) {
  if (game === "lol") {
    return data.applications?.lol?.status === "approved";
  }

  return Boolean(data.username && data.role && data.role !== "visitor");
}

function serializeMember(
  doc: FirebaseFirestore.QueryDocumentSnapshot,
  game: GameType
): MemberResponse | null {
  const data = doc.data();

  if (!data.username || !isApprovedForGame(game, data)) {
    return null;
  }

  return {
    id: doc.id,
    username: data.username,
    role: data.role ?? "member",
    photoURL: data.photoURL ?? "",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const game = searchParams.get("game");

  if (game !== "lol" && game !== "wowtbc") {
    return NextResponse.json(
      { error: "Invalid game parameter" },
      { status: 400 }
    );
  }

  try {
    const snapshot = await adminDb.collection("users").get();

    const members = snapshot.docs
      .map((doc) => serializeMember(doc, game))
      .filter((member): member is MemberResponse => member !== null);

    return NextResponse.json(members);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to fetch members",
        message,
      },
      { status: 500 }
    );
  }
}
