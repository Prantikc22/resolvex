import Link from "next/link";
import { cn } from "@/lib/utils";

export function Mark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 grid-cols-2 gap-[3px] rounded-[7px] bg-[#101114] p-[6px]",
        className,
      )}
    >
      <span className="rounded-[2px] bg-[#c8ff73]" />
      <span className="rounded-[2px] bg-[#96d8ff]" />
      <span className="rounded-[2px] bg-[#ff735c]" />
      <span className="rounded-[2px] bg-white" />
    </span>
  );
}

export function Logo({
  inverse = false,
  href = "/",
}: {
  inverse?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5"
      aria-label="ResolveX home"
    >
      <Mark className={inverse ? "bg-white" : undefined} />
      <span
        className={cn(
          "text-[19px] font-semibold tracking-[-0.02em]",
          inverse ? "text-white" : "text-[#101114]",
        )}
      >
        Resolve
        <span className={inverse ? "text-[#c8ff73]" : "text-[#355cff]"}>X</span>
      </span>
    </Link>
  );
}
