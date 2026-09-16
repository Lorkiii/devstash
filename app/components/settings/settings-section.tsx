import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface SettingsSectionProps {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
}

export function SettingsSection({
  id,
  title,
  description,
  icon: Icon,
  children,
}: SettingsSectionProps) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <header className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id={id} className="text-base font-bold tracking-tight text-foreground sm:text-lg">
            {title}
          </h2>
          <p className="mt-0.5 max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </header>
      {children}
    </section>
  );
}
