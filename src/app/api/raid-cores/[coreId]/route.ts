import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { isWowSpecialization } from "@/lib/wow-classes";
import {
  isRaidCharacterClass,
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

function getLegacyCharacterSignupId(name: string, server: string) {
  return createHash("sha256")
    .update(`${normalizeIdentity(server)}:${normalizeIdentity(name)}`)
    .digest("hex");
}

function getCharacterSignupId(
  name: string,
  server: string,
  coreId: string,
  size: number
) {
  return createHash("sha256")
    .update(
      `${normalizeIdentity(server)}:${normalizeIdentity(name)}:${coreId}:${size}`
    )
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

    if (
      !isRaidCoreSize(size) ||
      !characterName ||
      !server
    ) {
      return NextResponse.json(
        { error: "Escolha core, tamanho, personagem e classe validos." },
        { status: 400 }
      );
    }

    const userRef = adminDb.collection("users").doc(decodedToken.uid);
    const userSnapshot = await userRef.get();
    const userData = userSnapshot.data();
    const characters = Array.isArray(userData?.characters)
      ? (userData.characters as Array<{
          name?: unknown;
          server?: unknown;
          characterClass?: unknown;
          mainSpec?: unknown;
          offSpec?: unknown;
        }>)
      : [];
    const ownedCharacter = characters.find(
      (character) =>
        typeof character.name === "string" &&
        typeof character.server === "string" &&
        normalizeIdentity(character.name) === normalizeIdentity(characterName) &&
        normalizeIdentity(character.server) === normalizeIdentity(server)
    );

    if (!ownedCharacter) {
      return NextResponse.json(
        { error: "O personagem precisa estar aprovado e vinculado a sua conta." },
        { status: 400 }
      );
    }

    const characterClass = ownedCharacter.characterClass;
    const mainSpec = ownedCharacter.mainSpec;
    const offSpec = ownedCharacter.offSpec;
    if (
      !isRaidCharacterClass(characterClass) ||
      !isWowSpecialization(characterClass, mainSpec) ||
      (offSpec !== null && offSpec !== undefined &&
        (!isWowSpecialization(characterClass, offSpec) || offSpec === mainSpec))
    ) {
      return NextResponse.json(
        { error: "Esse personagem precisa ter classe e main spec no perfil." },
        { status: 400 }
      );
    }

    const signupsCollection = adminDb.collection("raidCoreSignups");
    const signupRef = signupsCollection.doc(
      getCharacterSignupId(characterName, server, coreId, size)
    );
    const legacySignupRef = signupsCollection.doc(
      getLegacyCharacterSignupId(characterName, server)
    );

    await adminDb.runTransaction(async (transaction) => {
      const [existingSignup, legacySignup] = await Promise.all([
        transaction.get(signupRef),
        transaction.get(legacySignupRef),
      ]);

      if (existingSignup.exists) {
        throw new Error("CHARACTER_ALREADY_REGISTERED");
      }

      let legacyMigrationRef: FirebaseFirestore.DocumentReference | null = null;
      let legacyMigrationData: FirebaseFirestore.DocumentData | null = null;

      if (legacySignup.exists) {
        const legacyData = legacySignup.data() || {};
        if (isRaidCoreId(legacyData.coreId) && isRaidCoreSize(legacyData.size)) {
          if (legacyData.coreId === coreId && legacyData.size === size) {
            throw new Error("CHARACTER_ALREADY_REGISTERED");
          }

          legacyMigrationRef = signupsCollection.doc(
            getCharacterSignupId(
              characterName,
              server,
              legacyData.coreId,
              legacyData.size
            )
          );
          legacyMigrationData = legacyData;
        }
      }

      const legacyMigrationSnapshot = legacyMigrationRef
        ? await transaction.get(legacyMigrationRef)
        : null;

      if (legacyMigrationRef && !legacyMigrationSnapshot?.exists && legacyMigrationData) {
        transaction.create(legacyMigrationRef, legacyMigrationData);
      }

      if (legacySignup.exists) {
        transaction.delete(legacySignupRef);
      }

      transaction.create(signupRef, {
        coreId,
        size,
        userId: decodedToken.uid,
        username: userData?.username || decodedToken.name || "Membro",
        characterName,
        characterClass,
        mainSpec,
        offSpec: typeof offSpec === "string" ? offSpec : null,
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