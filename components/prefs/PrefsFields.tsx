"use client";

import { Lock } from "lucide-react";
import { ACCESS_NEEDS, type AccessNeeds } from "@/lib/accessNeeds";
import { AVOID_OPTIONS, INTEREST_GROUPS } from "@/lib/interests";
import { CheckCard, Chip, ChipGroup, Field, TextArea } from "@/components/ui";

export type PrefsValues = {
  interests: string[];
  wantToTry: string[];
  avoid: string[];
  accessNeeds: AccessNeeds;
  accessNotes: string;
  shareAccessWithPartner: boolean;
};

export const EMPTY_PREFS: PrefsValues = {
  interests: [],
  wantToTry: [],
  avoid: [],
  accessNeeds: {},
  accessNotes: "",
  shareAccessWithPartner: false,
};

/**
 * The preference inputs, shared by onboarding and the profile page.
 *
 * Deliberately no submit button or form element — the two callers wrap this
 * differently (skip and advance during onboarding, save in place afterwards)
 * but the fields themselves must not drift apart.
 */
export default function PrefsFields({ values }: { values: PrefsValues }) {
  const interests = new Set(values.interests);
  const avoid = new Set(values.avoid);

  return (
    <div className="space-y-space-lg">
      <div className="space-y-space-md">
        <p className="text-label-sm text-on-surface-variant tracking-[0.15em]">
          THINGS YOU&apos;RE INTO
        </p>

        {INTEREST_GROUPS.map((group) => (
          <ChipGroup key={group.label} legend={group.label}>
            {group.items.map((item) => (
              <Chip
                key={item}
                name="interests"
                value={item}
                defaultChecked={interests.has(item)}
              >
                {item}
              </Chip>
            ))}
          </ChipGroup>
        ))}
      </div>

      <Field
        id="want_to_try"
        name="want_to_try"
        label="Anything you'd like to try"
        defaultValue={values.wantToTry.join(", ")}
        placeholder="pottery, kayaking, that new place on the corner"
        autoComplete="off"
      />

      <ChipGroup legend="Things to avoid">
        {AVOID_OPTIONS.map((option) => (
          <Chip
            key={option}
            name="avoid"
            value={option}
            defaultChecked={avoid.has(option)}
          >
            {option}
          </Chip>
        ))}
      </ChipGroup>

      <fieldset className="border-0 p-0 m-0">
        <legend className="text-label-sm text-on-surface-variant tracking-[0.15em] mb-space-xs">
          ANYTHING A DATE NEEDS TO WORK AROUND
        </legend>

        <p className="text-body-sm text-on-surface-variant mb-space-md">
          So we never suggest something that doesn&apos;t work for you.
        </p>

        <div className="grid gap-space-sm sm:grid-cols-2">
          {ACCESS_NEEDS.map((need) => (
            <CheckCard
              key={need.key}
              name={need.key}
              label={need.label}
              hint={need.hint}
              defaultChecked={Boolean(values.accessNeeds[need.key])}
            />
          ))}
        </div>
      </fieldset>

      <TextArea
        id="access_notes"
        name="access_notes"
        label="Anything else"
        rows={2}
        defaultValue={values.accessNotes}
        placeholder="Anything the boxes above don't cover"
      />

      <CheckCard
        name="share_access_with_partner"
        defaultChecked={values.shareAccessWithPartner}
        label={
          <span className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 text-on-surface-variant" aria-hidden />
            Let your partner see this
          </span>
        }
        hint="Off by default. Date ideas account for your needs either way — this only controls whether they can read them."
      />
    </div>
  );
}
