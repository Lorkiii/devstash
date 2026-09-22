interface ProjectBadgeProps {
  name: string;
  className?: string;
}

export function ProjectBadge({ name, className = "" }: ProjectBadgeProps) {
  return (
    <span className={`inline-flex min-w-0 max-w-full items-center rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] leading-4 text-accent-strong sm:px-2 sm:text-[10px] ${className}`}>
      <span className="truncate">{name}</span>
    </span>
  );
}
