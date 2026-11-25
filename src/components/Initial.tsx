import { cn } from "@/lib/utils";

/** A person's first letter in a circle. Avatars stay local: no names are sent to avatar services. */
export function Initial({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary font-display font-bold text-primary-foreground",
        size === "lg" ? "h-14 w-14 text-2xl" : "h-11 w-11 text-lg",
      )}
    >
      {(name.trim().charAt(0) || "?").toUpperCase()}
    </span>
  );
}
