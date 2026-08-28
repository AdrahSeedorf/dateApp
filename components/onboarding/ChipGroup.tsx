"use client";

type Props = {
  name: string;
  options: readonly string[];
  legend?: string;
  /** Already-chosen values, for editing rather than first-time selection. */
  selected?: readonly string[];
};

/**
 * Chips backed by real checkboxes.
 *
 * Kept as plain form inputs rather than click handlers with React state:
 * the whole step is one server action, so there's nothing to synchronise
 * and selections survive a failed submit for free.
 */
export default function ChipGroup({
  name,
  options,
  legend,
  selected = [],
}: Props) {
  const chosen = new Set(selected);

  return (
    <fieldset className="border-0 p-0 m-0 mb-4">
      {legend && (
        <legend className="text-white/40 text-xs tracking-[0.15em] mb-3">
          {legend.toUpperCase()}
        </legend>
      )}

      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option} className="cursor-pointer">
            <input
              type="checkbox"
              name={name}
              value={option}
              defaultChecked={chosen.has(option)}
              className="sr-only peer"
            />

            <span className="block px-4 py-2 rounded-full border border-white/10 bg-white/5 text-white/70 text-sm transition hover:bg-white/10 peer-checked:border-pink-300 peer-checked:bg-pink-500/20 peer-checked:text-pink-100 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-pink-300">
              {option}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
