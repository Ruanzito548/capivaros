import {
  isWowCharacterClass,
  WOW_CHARACTER_CLASSES,
  type WowCharacterClass,
} from "@/lib/wow-classes";

export const RAID_CORE_IDS = ["1"] as const;
export const RAID_CORE_SIZES = [40, 20, 10] as const;
export const RAID_CHARACTER_CLASSES = WOW_CHARACTER_CLASSES;

export type RaidCoreId = (typeof RAID_CORE_IDS)[number];
export type RaidCoreSize = (typeof RAID_CORE_SIZES)[number];
export type RaidCharacterClass = WowCharacterClass;

export interface RaidCoreSignup {
  id: string;
  coreId: RaidCoreId;
  size: RaidCoreSize;
  userId: string;
  username: string;
  characterName: string;
  characterClass?: RaidCharacterClass;
  mainSpec?: string;
  offSpec?: string | null;
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
  return isWowCharacterClass(value);
}