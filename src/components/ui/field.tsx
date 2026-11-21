"use client";

import { CircleAlert } from "lucide-react";
import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: ReactNode;
  helper?: ReactNode;
  /** Error text. Shown with an icon and tied to the control, never colour alone. */
  error?: ReactNode;
  /** Adds a muted "Optional" marker after the label. */
  optional?: boolean;
  /** The one control to wire up (Input, Textarea, and so on). */
  children: ReactElement<Record<string, unknown>>;
  className?: string;
};

/**
 * Label, helper text, error text and optional marker around one control.
 * It gives the control an `id`, links the label with `htmlFor`, and sets
 * `aria-describedby` (helper, then error) and `aria-invalid` when there is
 * an error. Announcing errors on submit belongs to the form features.
 */
export function Field({
  label,
  helper,
  error,
  optional,
  children,
  className,
}: FieldProps) {
  const generated = useId();
  const controlId =
    (isValidElement(children) && (children.props.id as string | undefined)) ||
    generated;
  const helperId = `${controlId}-helper`;
  const errorId = `${controlId}-error`;
  const ownDescribedBy = children.props["aria-describedby"] as
    string | undefined;
  const describedBy =
    [helper ? helperId : undefined, error ? errorId : undefined, ownDescribedBy]
      .filter(Boolean)
      .join(" ") || undefined;

  // Only set what Field knows. An undefined value would erase the control's own
  // `aria-invalid` or `aria-describedby`.
  const control = cloneElement(children, {
    id: controlId,
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
    ...(error ? { "aria-invalid": true } : {}),
  });

  return (
    <div
      data-slot="field"
      className={cn("flex w-full flex-col gap-2", className)}
    >
      <label htmlFor={controlId} className="text-label text-foreground">
        {label}
        {optional ? (
          <span className="text-helper text-muted-foreground ml-2 font-normal">
            Optional
          </span>
        ) : undefined}
      </label>
      {control}
      {helper ? (
        <p id={helperId} className="text-helper text-muted-foreground">
          {helper}
        </p>
      ) : undefined}
      {error ? (
        <p
          id={errorId}
          className="text-helper text-destructive flex items-start gap-1.5"
        >
          <Icon icon={CircleAlert} size={16} className="mt-px" />
          <span>{error}</span>
        </p>
      ) : undefined}
    </div>
  );
}
