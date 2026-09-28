export function PlayerAvatar({ name, className = "size-11 text-base" }: { name: string; className?: string }) {
  const letter = (name.trim()[0] || "?").toUpperCase();
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full bg-gold font-semibold text-espresso ${className}`}>
      {letter}
    </span>
  );
}
