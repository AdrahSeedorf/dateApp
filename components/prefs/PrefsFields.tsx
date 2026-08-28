"use client";

import { Lock } from "lucide-react";
import { ACCESS_NEEDS, type AccessNeeds } from "@/lib/accessNeeds";
import { AVOID_OPTIONS, INTEREST_GROUPS } from "@/lib/interests";
import ChipGroup from "@/components/onboarding/ChipGroup";

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
  return (
    <>
      <p className="text-white/50 text-sm mb-4 tracking-[0.1em]">
        THINGS YOU&apos;RE INTO
      </p>

      {INTEREST_GROUPS.map((group) => (
        <ChipGroup
          key={group.label}
          name="interests"
          legend={group.label}
          options={group.items}
          selected={values.interests}
        />
      ))}

      <div className="mt-8 mb-2">
        <label
          htmlFor="want_to_try"
          className="block text-white/50 text-sm mb-2 tracking-[0.1em]"
        >
          ANYTHING YOU&apos;D LIKE TO TRY
        </label>

        <input
          id="want_to_try"
          name="want_to_try"
          defaultValue={values.wantToTry.join(", ")}
          placeholder="pottery, kayaking, that new place on the corner"
          autoComplete="off"
          className="w-full px-5 py-3 rounded-full border border-white/10 bg-white/5 focus:border-pink-300 focus:outline-none text-sm text-white placeholder:text-white/30"
        />
      </div>

      <p className="text-white/50 text-sm mb-3 mt-6 tracking-[0.1em]">
        THINGS TO AVOID
      </p>

      <ChipGroup
        name="avoid"
        options={AVOID_OPTIONS}
        selected={values.avoid}
      />

      <fieldset className="border-0 p-0 m-0 mt-8 mb-5">
        <legend className="text-white/50 text-sm mb-2 tracking-[0.1em]">
          ANYTHING A DATE NEEDS TO WORK AROUND
        </legend>

        <p className="text-white/30 text-xs mb-4">
          So we never suggest something that doesn&apos;t work for you.
        </p>

        <div className="grid sm:grid-cols-2 gap-2">
          {ACCESS_NEEDS.map((need) => (
            <label
              key={need.key}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4 cursor-pointer"
            >
              <input
                type="checkbox"
                name={need.key}
                defaultChecked={Boolean(values.accessNeeds[need.key])}
                className="mt-1 accent-pink-500 w-4 h-4 shrink-0"
              />

              <span>
                <span className="block text-sm text-white/85">
                  {need.label}
                </span>
                {need.hint && (
                  <span className="block text-xs text-white/40 mt-0.5">
                    {need.hint}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mb-5">
        <label
          htmlFor="access_notes"
          className="block text-white/50 text-sm mb-2 tracking-[0.1em]"
        >
          ANYTHING ELSE
        </label>

        <textarea
          id="access_notes"
          name="access_notes"
          rows={2}
          defaultValue={values.accessNotes}
          placeholder="Anything the boxes above don't cover"
          className="w-full px-5 py-3 rounded-2xl border border-white/10 bg-white/5 focus:border-pink-300 focus:outline-none text-sm text-white placeholder:text-white/30 resize-none"
        />
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 cursor-pointer">
        <input
          type="checkbox"
          name="share_access_with_partner"
          defaultChecked={values.shareAccessWithPartner}
          className="mt-1 accent-pink-500 w-4 h-4 shrink-0"
        />

        <span>
          <span className="flex items-center gap-2 text-sm text-white/85">
            <Lock className="w-3.5 h-3.5 text-white/40" aria-hidden />
            Let your partner see this
          </span>
          <span className="block text-xs text-white/40 mt-1 leading-relaxed">
            Off by default. Date ideas account for your needs either way —
            this only controls whether they can read them.
          </span>
        </span>
      </label>
    </>
  );
}
