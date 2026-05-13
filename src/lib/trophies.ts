export interface Trophy {
  id?: string;
  name: string;
  description: string;
  icon?: string;
  points?: number;
  rarity?: string;
  awardedAt?: number | null;
}

export interface UserTrophiesMap {
  [game: string]: Trophy[] | undefined;
}

export function getGameTrophies(
  trophies: UserTrophiesMap | undefined,
  game: string
) {
  const gameTrophies = trophies?.[game];
  return Array.isArray(gameTrophies) ? gameTrophies : [];
}
