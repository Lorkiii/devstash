interface ProjectBadgeProps {
  name: string;
  className?: string;
}

export function ProjectBadge({ name, className = "" }: ProjectBadgeProps) {
  return (
    <span className={`inline-flex min-w-0 max-w-full items-center rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[10px] leading-4 text-accent-strong ${className}`}>
      <span className="truncate">{name}</span>
    </span>
  );
}
