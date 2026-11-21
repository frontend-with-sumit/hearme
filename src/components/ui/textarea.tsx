"use client";

import { useId, useState, type ChangeEvent, type ComponentProps } from "react";

import { cn } from "@/lib/utils";

type TextareaProps = ComponentProps<"textarea"> & {
  invalid?: boolean;
  /** Shows a "54 / 280" counter under the box. Needs `maxLength`. */
  showCount?: boolean;
};

const WARN_AT = 20;

/** Words for the screen reader live region: only at 20 left and at 0. */
function announcement(remaining: number): string {
  if (remaining === 0) return "Character limit reached";
  if (remaining === WARN_AT) return `${WARN_AT} characters remaining`;
  return "";
}

/**
 * Multi line input, at least 96px tall, styled like Input. With `showCount`
 * and `maxLength` it draws a visual counter (hidden from assistive technology)
 * and a separate visually hidden live region that speaks only when 20
 * characters remain and at 0, so a screen reader is not read every keystroke.
 */
export function Textarea({
  className,
  invalid,
  showCount,
  maxLength,
  onChange,
  value,
  defaultValue,
  ...props
}: TextareaProps) {
  const counterId = useId();
  const [typed, setTyped] = useState(String(defaultValue ?? "").length);
  const length = value === undefined ? typed : String(value).length;
  const counting = showCount && maxLength !== undefined;

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setTyped(event.target.value.length);
    onChange?.(event);
  };

  return (
    <div className="flex w-full flex-col gap-1.5">
      <textarea
        {...props}
        data-slot="textarea"
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        aria-invalid={invalid || props["aria-invalid"] || undefined}
        className={cn(
          "bg-card text-input-text text-card-foreground border-input min-h-24 w-full min-w-0 resize-y rounded-control border-[1.5px] px-4 py-3.5",
          "placeholder:text-muted-foreground transition-colors duration-150",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive",
          className,
        )}
      />
      {counting ? (
        <>
          <span
            aria-hidden="true"
            data-slot="textarea-count"
            className="text-muted-foreground self-end text-xs"
          >
            {length} / {maxLength}
          </span>
          <span
            id={counterId}
            role="status"
            aria-live="polite"
            className="sr-only"
          >
            {announcement(maxLength - length)}
          </span>
        </>
      ) : undefined}
    </div>
  );
}
