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

const WOW_SPEC_ICONS = {
  Druida: {
    Balance: "spell_nature_starfall",
    Feral: "ability_druid_catform",
    Restoration: "spell_nature_healingtouch",
  },
  Caçador: {
    "Beast Mastery": "ability_hunter_bestialdiscipline",
    Marksmanship: "ability_marksmanship",
    Survival: "ability_hunter_swiftstrike",
  },
  Mago: {
    Arcane: "spell_holy_magicalsentry",
    Fire: "spell_fire_flamebolt",
    Frost: "spell_frost_frostbolt02",
  },
  Paladino: {
    Holy: "spell_holy_holybolt",
    Protection: "spell_holy_devotionaura",
    Retribution: "spell_holy_auraoflight",
  },
  Sacerdote: {
    Discipline: "spell_holy_wordfortitude",
    Holy: "spell_holy_holybolt",
    Shadow: "spell_shadow_shadowwordpain",
  },
  Ladino: {
    Assassination: "ability_rogue_eviscerate",
    Combat: "ability_backstab",
    Subtlety: "ability_stealth",
  },
  Xamã: {
    Elemental: "spell_nature_lightning",
    Enhancement: "spell_nature_lightningshield",
    Restoration: "spell_nature_magicimmunity",
  },
  Bruxo: {
    Affliction: "spell_shadow_deathcoil",
    Demonology: "spell_shadow_metamorphosis",
    Destruction: "spell_shadow_rainoffire",
  },
  Guerreiro: {
    Arms: "ability_warrior_savageblow",
    Fury: "ability_warrior_innerrage",
    Protection: "ability_warrior_defensivestance",
  },
} as const satisfies Record<WowCharacterClass, Record<string, string>>;

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

export function getWowheadSpecIconUrl(
  characterClass: unknown,
  specialization: unknown
) {
  if (!isWowCharacterClass(characterClass) || typeof specialization !== "string") {
    return null;
  }

  const icon = WOW_SPEC_ICONS[characterClass][
    specialization as keyof (typeof WOW_SPEC_ICONS)[typeof characterClass]
  ];

  return icon
    ? `https://wow.zamimg.com/images/wow/icons/large/${icon}.jpg`
    : null;
}