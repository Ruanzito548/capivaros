export interface RankingEntry {
  username: string;
  character: string;
  percent: number;
  photoURL?: string;
}

export interface Trophy {
  name: string;
  description: string;
  icon?: string;
}

const KARAZHAN_ZONE_ID = 1047;
const GRUUL_MAG_ZONE_ID = 1048;

const MANAGED_TROPHY_NAMES = new Set([
  "Top 1 Season 1 Karazhan",
  "Top 2 Season 1 Karazhan",
  "Top 3 Season 1 Karazhan",
  "Top 1 Season 1 Gruull/Mag",
  "Top 2 Season 1 Gruull/Mag",
  "Top 3 Season 1 Gruull/Mag",
  "Entre os 5 melhores Karazhan",
  "Entre os 5 melhores Gruul/Mag",
]);

function normalizeUsername(username?: string) {
  return typeof username === "string" ? username.trim().toLowerCase() : "";
}

function getUniqueMemberRanking(entries: RankingEntry[]) {
  const seen = new Set<string>();
  const ranking: RankingEntry[] = [];

  for (const entry of entries) {
    const normalizedUsername = normalizeUsername(entry.username);

    if (!normalizedUsername || seen.has(normalizedUsername)) {
      continue;
    }

    seen.add(normalizedUsername);
    ranking.push(entry);
  }

  return ranking;
}

function buildZoneTrophies(
  zoneName: "Karazhan" | "Gruul/Mag",
  topPrefix: "Karazhan" | "Gruull/Mag",
  ranking: RankingEntry[],
  username: string
) {
  const normalizedUsername = normalizeUsername(username);
  const uniqueRanking = getUniqueMemberRanking(ranking).slice(0, 5);
  const placement = uniqueRanking.findIndex(
    (entry) => normalizeUsername(entry.username) === normalizedUsername
  );

  if (placement === -1) {
    return [];
  }

  const trophies: Trophy[] = [
    {
      name: `Entre os 5 melhores ${zoneName}`,
      description: `Terminou entre os 5 melhores membros do ranking de ${zoneName} na Season 1.`,
      icon: "🏅",
    },
  ];

  if (placement === 0) {
    trophies.unshift({
      name: `Top 1 Season 1 ${topPrefix}`,
      description: `Conquistou o 1º lugar entre os membros no ranking de ${zoneName} na Season 1.`,
      icon: "🥇",
    });
  }

  if (placement === 1) {
    trophies.unshift({
      name: `Top 2 Season 1 ${topPrefix}`,
      description: `Conquistou o 2º lugar entre os membros no ranking de ${zoneName} na Season 1.`,
      icon: "🥈",
    });
  }

  if (placement === 2) {
    trophies.unshift({
      name: `Top 3 Season 1 ${topPrefix}`,
      description: `Conquistou o 3º lugar entre os membros no ranking de ${zoneName} na Season 1.`,
      icon: "🥉",
    });
  }

  return trophies;
}

export function mergeWowTbcTrophies(existingTrophies: Trophy[], derivedTrophies: Trophy[]) {
  const preservedTrophies = existingTrophies.filter(
    (trophy) => !MANAGED_TROPHY_NAMES.has(trophy.name)
  );

  return [...preservedTrophies, ...derivedTrophies];
}

export function getWowTbcRankingTrophiesForUser(
  username: string,
  rankings: Record<number, RankingEntry[]>
) {
  return [
    ...buildZoneTrophies(
      "Karazhan",
      "Karazhan",
      rankings[KARAZHAN_ZONE_ID] ?? [],
      username
    ),
    ...buildZoneTrophies(
      "Gruul/Mag",
      "Gruull/Mag",
      rankings[GRUUL_MAG_ZONE_ID] ?? [],
      username
    ),
  ];
}

export async function fetchWowTbcRankingTrophies(
  username: string,
  existingTrophies: Trophy[] = []
) {
  try {
    const [karazhanResponse, gruulMagResponse] = await Promise.all([
      fetch(`/api/ranking?zone=${KARAZHAN_ZONE_ID}&limit=20`),
      fetch(`/api/ranking?zone=${GRUUL_MAG_ZONE_ID}&limit=20`),
    ]);

    const [karazhanRanking, gruulMagRanking] = await Promise.all([
      karazhanResponse.ok ? karazhanResponse.json() : Promise.resolve([]),
      gruulMagResponse.ok ? gruulMagResponse.json() : Promise.resolve([]),
    ]);

    const derivedTrophies = getWowTbcRankingTrophiesForUser(username, {
      [KARAZHAN_ZONE_ID]: Array.isArray(karazhanRanking) ? karazhanRanking : [],
      [GRUUL_MAG_ZONE_ID]: Array.isArray(gruulMagRanking) ? gruulMagRanking : [],
    });

    return mergeWowTbcTrophies(existingTrophies, derivedTrophies);
  } catch {
    return mergeWowTbcTrophies(existingTrophies, []);
  }
}
