"use client";

type Props = {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
};

export default function PillGroup({ label, options, value, onChange }: Props) {
  return (
    <fieldset className="mb-6 border-0 p-0 m-0">
      <legend className="text-white/50 text-sm mb-3 tracking-[0.15em]">
        {label.toUpperCase()}
      </legend>

      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={`px-5 py-3 rounded-full border transition text-sm font-medium ${
              value === option
                ? "border-pink-300 bg-pink-500/20 text-pink-100"
                : "border-white/10 bg-white/5 hover:bg-white/10 text-white/70"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
