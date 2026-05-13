interface TrophyIconProps {
  icon?: string;
  alt: string;
  className?: string;
}

export default function TrophyIcon({
  icon,
  alt,
  className = "h-12 w-12",
}: TrophyIconProps) {
  if (typeof icon === "string" && icon.startsWith("/")) {
    return (
      <img
        src={icon}
        alt={alt}
        className={`mx-auto object-contain ${className}`}
      />
    );
  }

  return <span>{icon || "🏆"}</span>;
}
