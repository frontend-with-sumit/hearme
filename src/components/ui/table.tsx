import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * A real `table` with a horizontal scroll wrapper for narrow screens. The
 * wrapper clips, so controls inside cells need cell padding of at least 2px
 * around a 40px control to keep their 44px pointer area.
 */
export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div data-slot="table-container" className="w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn(
          "text-body-small w-full caption-bottom border-collapse",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function TableCaption({
  className,
  ...props
}: ComponentProps<"caption">) {
  return (
    <caption
      className={cn(
        "text-helper text-muted-foreground mt-3 text-left",
        className,
      )}
      {...props}
    />
  );
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("border-border border-b", className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={className} {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("border-divider border-b last:border-b-0", className)}
      {...props}
    />
  );
}

/** Column header. `scope="col"` by default; pass `scope="row"` for a row header. */
export function TableHead({
  className,
  scope = "col",
  ...props
}: ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      scope={scope}
      className={cn(
        "text-eyebrow text-muted-foreground px-4 py-3 text-left align-middle uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("text-foreground px-4 py-3 align-middle", className)}
      {...props}
    />
  );
}
