import { getWowheadSpecIconUrl } from "@/lib/wow-classes";

interface WowSpecIconsProps {
  characterClass?: string;
  mainSpec?: string;
  offSpec?: string | null;
}

export default function WowSpecIcons({
  characterClass,
  mainSpec,
  offSpec,
}: WowSpecIconsProps) {
  const mainIcon = getWowheadSpecIconUrl(characterClass, mainSpec);
  const offIcon = getWowheadSpecIconUrl(characterClass, offSpec);

  if (!mainIcon && !offIcon) {
    return <span className="text-xs text-gray-500">Specs nao cadastradas</span>;
  }

  return (
    <span className="flex shrink-0 items-center gap-1">
      {mainIcon && (
        <img
          src={mainIcon}
          alt={`Main spec: ${mainSpec}`}
          title={`Main spec: ${mainSpec}`}
          width={24}
          height={24}
          loading="lazy"
          className="h-6 w-6 rounded-sm"
        />
      )}
      {offIcon && (
        <img
          src={offIcon}
          alt={`Off spec: ${offSpec}`}
          title={`Off spec: ${offSpec}`}
          width={20}
          height={20}
          loading="lazy"
          className="h-5 w-5 rounded-sm opacity-75"
        />
      )}
    </span>
  );
}