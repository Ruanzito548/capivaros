import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { canAccessWowAdmin } from "@/lib/permissions";
import { isRaidCoreId, isRaidCoreSize } from "@/lib/raid-cores";

export const runtime = "nodejs";

async function getAuthorizedAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) return null;

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userSnapshot = await adminDb
      .collection("users")
      .doc(decodedToken.uid)
      .get();

    return canAccessWowAdmin(userSnapshot.data()?.role ?? null)
      ? decodedToken
      : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const decodedToken = await getAuthorizedAdmin(request);
  if (!decodedToken) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const snapshot = await adminDb.collection("raidCoreSignups").get();
    const signups = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    }));

    return NextResponse.json(signups);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to load core signups", message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const decodedToken = await getAuthorizedAdmin(request);
  if (!decodedToken) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      signupId?: unknown;
      action?: unknown;
      slot?: unknown;
    };
    const signupId = typeof body.signupId === "string" ? body.signupId : "";
    const action = body.action;

    if (
      !signupId ||
      (action !== "place" && action !== "unplace" && action !== "remove")
    ) {
      return NextResponse.json({ error: "Invalid core action" }, { status: 400 });
    }

    const signupRef = adminDb.collection("raidCoreSignups").doc(signupId);

    if (action === "remove") {
      await signupRef.delete();
      return NextResponse.json({ success: true });
    }

    if (action === "unplace") {
      await signupRef.update({
        status: "pending",
        slot: null,
        placedAt: null,
        placedBy: null,
      });
      return NextResponse.json({ success: true });
    }

    const slot = body.slot;
    if (typeof slot !== "number" || !Number.isInteger(slot)) {
      return NextResponse.json({ error: "Invalid composition slot" }, { status: 400 });
    }

    await adminDb.runTransaction(async (transaction) => {
      const signupSnapshot = await transaction.get(signupRef);
      if (!signupSnapshot.exists) {
        throw new Error("SIGNUP_NOT_FOUND");
      }

      const signup = signupSnapshot.data() || {};
      if (
        !isRaidCoreId(signup.coreId) ||
        !isRaidCoreSize(signup.size) ||
        slot < 1 ||
        slot > signup.size
      ) {
        throw new Error("INVALID_COMPOSITION_SLOT");
      }

      const coreSignupsQuery = adminDb
        .collection("raidCoreSignups")
        .where("coreId", "==", signup.coreId);
      const coreSignupsSnapshot = await transaction.get(coreSignupsQuery);
      const isSlotOccupied = coreSignupsSnapshot.docs.some((document) => {
        if (document.id === signupId) return false;
        const data = document.data();
        return (
          data.status === "selected" &&
          data.size === signup.size &&
          data.slot === slot
        );
      });

      if (isSlotOccupied) {
        throw new Error("RAID_CORE_SLOT_TAKEN");
      }

      transaction.update(signupRef, {
        status: "selected",
        slot,
        placedAt: Date.now(),
        placedBy: decodedToken.uid,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "RAID_CORE_SLOT_TAKEN") {
        return NextResponse.json({ error: "Esse slot ja esta ocupado." }, { status: 409 });
      }
      if (error.message === "SIGNUP_NOT_FOUND") {
        return NextResponse.json({ error: "Inscricao nao encontrada." }, { status: 404 });
      }
      if (error.message === "INVALID_COMPOSITION_SLOT") {
        return NextResponse.json({ error: "Slot invalido para esse core." }, { status: 400 });
      }
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update core composition", message },
      { status: 500 }
    );
  }
}