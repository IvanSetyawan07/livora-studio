import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div className="min-w-0">
        <p className="label-eyebrow text-ai">{eyebrow}</p>
        <h1 className="text-display mt-1.5 text-2xl leading-tight text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
