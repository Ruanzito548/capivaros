import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  isRaidCoreId,
  isRaidCoreSize,
  type RaidCoreSignup,
} from "@/lib/raid-cores";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ coreId: string }>;
}

function normalizeIdentity(value: string) {
  return value.trim().normalize("NFKC").toLocaleLowerCase("en-US");
}

function getCharacterSignupId(name: string, server: string) {
  return createHash("sha256")
    .update(`${normalizeIdentity(server)}:${normalizeIdentity(name)}`)
    .digest("hex");
}

async function getOptionalUserId(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) return null;

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  } catch {
    return null;
  }
}

async function getRequiredUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) return null;

  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { coreId } = await context.params;

  if (!isRaidCoreId(coreId)) {
    return NextResponse.json({ error: "Core not found" }, { status: 404 });
  }

  try {
    const userId = await getOptionalUserId(request);
    const coreSnapshot = await adminDb
      .collection("raidCoreSignups")
      .where("coreId", "==", coreId)
      .get();

    const signups = coreSnapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    })) as RaidCoreSignup[];
    const validCoreSignups = signups.filter((signup) =>
      isRaidCoreId(signup.coreId)
    );
    const roster = validCoreSignups
      .filter((signup) => signup.status === "selected" && signup.slot !== null)
      .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));

    let mySignups: RaidCoreSignup[] = [];
    if (userId) {
      const userSnapshot = await adminDb
        .collection("raidCoreSignups")
        .where("userId", "==", userId)
        .get();
      const userSignups = userSnapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      })) as RaidCoreSignup[];
      mySignups = userSignups.filter((signup) => isRaidCoreId(signup.coreId));
    }

    return NextResponse.json({ coreId, roster, mySignups });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to load core composition", message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const decodedToken = await getRequiredUser(request);
  if (!decodedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { coreId } = await context.params;
  if (!isRaidCoreId(coreId)) {
    return NextResponse.json({ error: "Core not found" }, { status: 404 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const size = body.size;
    const characterName =
      typeof body.characterName === "string" ? body.characterName.trim() : "";
    const server = typeof body.server === "string" ? body.server.trim() : "";

    if (!isRaidCoreSize(size) || !characterName || !server) {
      return NextResponse.json(
        { error: "Escolha um core, tamanho e personagem validos." },
        { status: 400 }
      );
    }

    const userRef = adminDb.collection("users").doc(decodedToken.uid);
    const userSnapshot = await userRef.get();
    const userData = userSnapshot.data();
    const characters = Array.isArray(userData?.characters)
      ? (userData.characters as Array<{ name?: unknown; server?: unknown }>)
      : [];
    const ownsCharacter = characters.some(
      (character) =>
        typeof character.name === "string" &&
        typeof character.server === "string" &&
        normalizeIdentity(character.name) === normalizeIdentity(characterName) &&
        normalizeIdentity(character.server) === normalizeIdentity(server)
    );

    if (!ownsCharacter) {
      return NextResponse.json(
        { error: "O personagem precisa estar aprovado e vinculado a sua conta." },
        { status: 400 }
      );
    }

    const signupId = getCharacterSignupId(characterName, server);
    const signupRef = adminDb.collection("raidCoreSignups").doc(signupId);

    await adminDb.runTransaction(async (transaction) => {
      const existingSignup = await transaction.get(signupRef);
      if (existingSignup.exists) {
        const existingCore = existingSignup.data()?.coreId;
        if (isRaidCoreId(existingCore)) {
          throw new Error("CHARACTER_ALREADY_REGISTERED");
        }

        transaction.set(signupRef, {
          coreId,
          size,
          userId: decodedToken.uid,
          username: userData?.username || decodedToken.name || "Membro",
          characterName,
          server,
          status: "pending",
          slot: null,
          appliedAt: Date.now(),
          placedAt: null,
        });
        return;
      }

      transaction.create(signupRef, {
        coreId,
        size,
        userId: decodedToken.uid,
        username: userData?.username || decodedToken.name || "Membro",
        characterName,
        server,
        status: "pending",
        slot: null,
        appliedAt: Date.now(),
        placedAt: null,
      });
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "CHARACTER_ALREADY_REGISTERED") {
      return NextResponse.json(
        { error: "Este personagem ja esta inscrito em um core." },
        { status: 409 }
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to register character", message },
      { status: 500 }
    );
  }
}