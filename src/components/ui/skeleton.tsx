import { cn } from "./utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-slate-200 dark:bg-black animate-pulse rounded-md border border-transparent dark:border-white/[0.03]", className)}
      {...props}
    />
  );
}

export { Skeleton };
