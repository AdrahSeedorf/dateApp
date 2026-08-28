/**
 * Access needs, as discrete keys rather than free text.
 *
 * The whole point of structuring these is that a generated date can be
 * *checked* against them afterwards. A sentence buried in a notes field is
 * something a model can quietly drop; a boolean can be enforced.
 *
 * Framed as things a date needs to work around, never as a diagnosis. The
 * app has no business asking anyone what condition they have.
 */
export const ACCESS_NEEDS = [
  {
    key: "step_free",
    label: "Step-free access",
    hint: "No stairs, steep paths or rough ground",
  },
  {
    key: "seating",
    label: "Somewhere to sit",
    hint: "Regular places to rest",
  },
  {
    key: "accessible_wc",
    label: "Accessible toilet nearby",
    hint: "",
  },
  {
    key: "quiet",
    label: "Quiet, not crowded",
    hint: "",
  },
  {
    key: "low_sensory",
    label: "Low sensory load",
    hint: "No loud music, flashing lights or strong smells",
  },
  {
    key: "low_energy",
    label: "Short and low effort",
    hint: "Nothing physically demanding or long",
  },
  {
    key: "assistance_animal",
    label: "Assistance animal welcome",
    hint: "",
  },
] as const;

export type AccessNeedKey = (typeof ACCESS_NEEDS)[number]["key"];

export type AccessNeeds = Partial<Record<AccessNeedKey, boolean>>;

/** Only the ones actually switched on, as readable phrases for a prompt. */
export function activeAccessLabels(needs: AccessNeeds): string[] {
  return ACCESS_NEEDS.filter((need) => needs[need.key]).map(
    (need) => need.label
  );
}

export function parseAccessNeeds(value: unknown): AccessNeeds {
  if (!value || typeof value !== "object") return {};

  const source = value as Record<string, unknown>;
  const result: AccessNeeds = {};

  for (const need of ACCESS_NEEDS) {
    if (source[need.key] === true) result[need.key] = true;
  }

  return result;
}
