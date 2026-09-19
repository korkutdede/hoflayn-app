import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  className,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-5 py-8",
        className,
      )}
    >
      <div className="space-y-1">
        <p className="font-medium text-zinc-900">{title}</p>
        <p className="max-w-md text-sm text-zinc-600">{description}</p>
      </div>
      {actionHref && actionLabel ? (
        <Button asChild size="sm">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
