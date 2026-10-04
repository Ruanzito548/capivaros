export const RAID_CORE_IDS = ["1"] as const;
export const RAID_CORE_SIZES = [40, 20, 10] as const;
export const RAID_CHARACTER_CLASSES = [
  "Druida",
  "Caçador",
  "Mago",
  "Paladino",
  "Sacerdote",
  "Ladino",
  "Xamã",
  "Bruxo",
  "Guerreiro",
] as const;

export type RaidCoreId = (typeof RAID_CORE_IDS)[number];
export type RaidCoreSize = (typeof RAID_CORE_SIZES)[number];
export type RaidCharacterClass = (typeof RAID_CHARACTER_CLASSES)[number];

export interface RaidCoreSignup {
  id: string;
  coreId: RaidCoreId;
  size: RaidCoreSize;
  userId: string;
  username: string;
  characterName: string;
  characterClass?: RaidCharacterClass;
  server: string;
  status: "pending" | "selected";
  slot: number | null;
  appliedAt: number;
  placedAt: number | null;
}

export function isRaidCoreId(value: unknown): value is RaidCoreId {
  return typeof value === "string" && RAID_CORE_IDS.includes(value as RaidCoreId);
}

export function isRaidCoreSize(value: unknown): value is RaidCoreSize {
  return typeof value === "number" && RAID_CORE_SIZES.includes(value as RaidCoreSize);
}

export function isRaidCharacterClass(value: unknown): value is RaidCharacterClass {
  return typeof value === "string" &&
    RAID_CHARACTER_CLASSES.includes(value as RaidCharacterClass);
}