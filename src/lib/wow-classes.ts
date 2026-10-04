const WOW_CLASS_DATA = [
  { name: "Druida", logsClassId: 11, specializations: ["Balance", "Feral", "Restoration"] },
  { name: "Caçador", logsClassId: 3, specializations: ["Beast Mastery", "Marksmanship", "Survival"] },
  { name: "Mago", logsClassId: 8, specializations: ["Arcane", "Fire", "Frost"] },
  { name: "Paladino", logsClassId: 2, specializations: ["Holy", "Protection", "Retribution"] },
  { name: "Sacerdote", logsClassId: 5, specializations: ["Discipline", "Holy", "Shadow"] },
  { name: "Ladino", logsClassId: 4, specializations: ["Assassination", "Combat", "Subtlety"] },
  { name: "Xamã", logsClassId: 7, specializations: ["Elemental", "Enhancement", "Restoration"] },
  { name: "Bruxo", logsClassId: 9, specializations: ["Affliction", "Demonology", "Destruction"] },
  { name: "Guerreiro", logsClassId: 1, specializations: ["Arms", "Fury", "Protection"] },
] as const;

export type WowCharacterClass = (typeof WOW_CLASS_DATA)[number]["name"];

export const WOW_CHARACTER_CLASSES: readonly WowCharacterClass[] =
  WOW_CLASS_DATA.map((characterClass) => characterClass.name);

export function getWowClassFromLogsId(value: unknown): WowCharacterClass | null {
  if (typeof value !== "number") return null;
  return WOW_CLASS_DATA.find((characterClass) => characterClass.logsClassId === value)?.name ?? null;
}

export function isWowCharacterClass(value: unknown): value is WowCharacterClass {
  return typeof value === "string" &&
    WOW_CLASS_DATA.some((characterClass) => characterClass.name === value);
}

export function getWowSpecializations(characterClass: unknown): readonly string[] {
  if (!isWowCharacterClass(characterClass)) return [];
  return WOW_CLASS_DATA.find((entry) => entry.name === characterClass)?.specializations ?? [];
}

export function isWowSpecialization(
  characterClass: unknown,
  specialization: unknown
): specialization is string {
  return typeof specialization === "string" &&
    getWowSpecializations(characterClass).includes(specialization);
}