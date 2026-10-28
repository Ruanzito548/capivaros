import { adminDb } from "@/lib/firebase-admin";
import { isRaidCoreSize, type RaidCore } from "@/lib/raid-cores";

export async function listRaidCores(): Promise<RaidCore[]> {
  const snapshot = await adminDb.collection("raidCores").get();
  const created = snapshot.docs
    .map((document) => ({
      id: document.id,
      name: String(document.data().name ?? ""),
      size: document.data().size,
    }))
    .filter((core): core is RaidCore => Boolean(core.name) && isRaidCoreSize(core.size))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }));

  return created;
}

export async function getRaidCore(coreId: string): Promise<RaidCore | null> {
  const document = await adminDb.collection("raidCores").doc(coreId).get();
  const data = document.data();
  if (!document.exists || !data?.name || !isRaidCoreSize(data.size)) return null;

  return { id: document.id, name: String(data.name), size: data.size };
}
