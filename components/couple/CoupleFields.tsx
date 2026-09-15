"use client";

import { useState } from "react";
import { STAGES, THEMES, type Stage, type Theme } from "@/lib/coupleProfile";
import { Field, cn } from "@/components/ui";

export type CoupleValues = {
  name: string;
  startedAt: string;
  stage: Stage | null;
  theme: Theme;
};

export const EMPTY_COUPLE: CoupleValues = {
  name: "",
  startedAt: "",
  stage: null,
  theme: "midnight",
};

/**
 * The shared fields, used by both onboarding and the profile page.
 *
 * Same reasoning as PrefsFields: two callers wrap this differently, but the
 * fields themselves must not drift apart.
 */
export default function CoupleFields({ values }: { values: CoupleValues }) {
  const [stage, setStage] = useState<Stage | null>(values.stage);
  const [theme, setTheme] = useState<Theme>(values.theme);

  /**
   * Applies the theme to the live page as it's picked.
   *
   * The whole token layer is driven by this attribute, so previewing is a
   * one-line change rather than a mock — and seeing it is the only way to
   * choose between four dark palettes.
   */
  function preview(next: Theme) {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <div className="space-y-space-lg">
      <div className="grid gap-space-md sm:grid-cols-2">
        <Field
          name="couple_name"
          label="What to call yourselves"
          placeholder="Us"
          defaultValue={values.name}
          maxLength={80}
        />

        <Field
          name="started_at"
          type="date"
          label="Together since"
          defaultValue={values.startedAt}
          hint="Leave it empty until it's real."
        />
      </div>

      <fieldset className="border-0 p-0 m-0">
        <legend className="mb-space-sm text-label-sm text-on-surface-variant tracking-[0.15em]">
          YOUR CHAPTER
        </legend>

        <p className="mb-space-md text-body-sm text-on-surface-variant">
          Shapes the date ideas you get — what suits you now isn&apos;t what
          suited you three years ago.
        </p>

        <div className="grid gap-space-sm sm:grid-cols-2">
          {STAGES.map((option) => (
            <label
              key={option.key}
              className={cn(
                "cursor-pointer rounded-lg border p-space-md transition",
                stage === option.key
                  ? "border-primary bg-[rgb(var(--c-glow-a)/0.12)]"
                  : "border-[var(--glass-rim)] bg-[var(--glass-1)] hover:bg-[var(--glass-2)]",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
              )}
            >
              <input
                type="radio"
                name="stage"
                value={option.key}
                checked={stage === option.key}
                onChange={() => setStage(option.key)}
                className="sr-only"
              />
              <span className="block text-body-md text-on-surface">
                <span aria-hidden>{option.icon} </span>
                {option.label}
              </span>
              <span className="mt-0.5 block text-body-sm text-on-surface-variant">
                {option.hint}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="border-0 p-0 m-0">
        <legend className="mb-space-sm text-label-sm text-on-surface-variant tracking-[0.15em]">
          SANCTUARY GLOW
        </legend>

        <p className="mb-space-md text-body-sm text-on-surface-variant">
          Changes as you pick, so you can see it.
        </p>

        <div className="flex flex-wrap gap-space-sm">
          {THEMES.map((option) => (
            <label key={option.key} className="cursor-pointer">
              <input
                type="radio"
                name="theme"
                value={option.key}
                checked={theme === option.key}
                onChange={() => preview(option.key)}
                className="sr-only peer"
              />
              <span
                className={cn(
                  "flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-label-md transition",
                  theme === option.key
                    ? "border-primary text-on-surface"
                    : "border-[var(--glass-rim)] text-on-surface-variant hover:text-on-surface",
                  "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
                )}
              >
                <span
                  aria-hidden
                  className="h-4 w-4 rounded-full"
                  style={{ background: option.swatch }}
                />
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
