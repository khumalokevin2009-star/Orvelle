"use client";

type SettingToggleProps = {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
};

export function SettingToggle({
  label,
  description,
  checked,
  onToggle
}: SettingToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="surface-primary flex w-full cursor-pointer flex-col items-start gap-4 px-4 py-4 text-left transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <div className="type-section-title text-[15px]">{label}</div>
        <div className="type-body-text mt-1 text-[14px]">{description}</div>
      </div>
      <span
        className={`relative h-7 w-12 rounded-full transition ${
          checked ? "bg-[#2563EB]" : "bg-[#D1D5DB]"
        }`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}
