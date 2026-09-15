"use client";

// Client-side because of useId, which generates the label/hint/error id
// triple. The alternative is making every caller invent unique ids by hand,
// which they will eventually get wrong and silently break the associations.

import { type InputHTMLAttributes, type TextareaHTMLAttributes, useId } from "react";
import { cn } from "./cn";

const CONTROL =
  "w-full min-h-[52px] rounded-lg px-4 py-3 font-body text-body-md " +
  "bg-[rgb(255_255_255/0.05)] border border-[var(--glass-rim)] " +
  "text-on-surface placeholder:text-on-surface-variant/60 " +
  "transition focus:outline-none focus:border-primary " +
  "focus:shadow-[0_0_12px_rgb(var(--c-glow-a)/0.25)]";

type Shared = {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
};

type InputProps = Shared &
  Omit<InputHTMLAttributes<HTMLInputElement>, keyof Shared>;

/**
 * A labelled text input.
 *
 * The label is a real <label>, never a placeholder standing in for one — a
 * placeholder disappears the moment someone types, which strands anyone
 * using a screen reader or returning to a half-filled form. Hints and errors
 * are wired through aria-describedby so they're announced rather than merely
 * displayed.
 */
export function Field({
  label,
  hint,
  error,
  className,
  id,
  ...rest
}: InputProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className={cn("flex flex-col gap-space-xs", className)}>
      <label
        htmlFor={fieldId}
        className="text-label-sm text-on-surface-variant tracking-[0.15em]"
      >
        {label.toUpperCase()}
      </label>

      <input
        id={fieldId}
        aria-describedby={cn(hintId, errorId) || undefined}
        aria-invalid={error ? true : undefined}
        className={cn(CONTROL, error && "border-error focus:border-error")}
        {...rest}
      />

      {hint && !error && (
        <p id={hintId} className="text-body-sm text-on-surface-variant">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-body-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

type AreaProps = Shared &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, keyof Shared>;

export function TextArea({
  label,
  hint,
  error,
  className,
  id,
  rows = 5,
  ...rest
}: AreaProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className={cn("flex flex-col gap-space-xs", className)}>
      <label
        htmlFor={fieldId}
        className="text-label-sm text-on-surface-variant tracking-[0.15em]"
      >
        {label.toUpperCase()}
      </label>

      <textarea
        id={fieldId}
        rows={rows}
        aria-describedby={cn(hintId, errorId) || undefined}
        aria-invalid={error ? true : undefined}
        className={cn(CONTROL, "resize-y", error && "border-error focus:border-error")}
        {...rest}
      />

      {hint && !error && (
        <p id={hintId} className="text-body-sm text-on-surface-variant">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-body-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
