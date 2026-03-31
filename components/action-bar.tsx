import type { ComponentType, SVGProps } from "react";
import { BoltIcon, DownloadIcon, SettingsIcon, StatsIcon } from "@/components/icons";

export type ActionPanel = "automations" | "statistics" | "settings";

type Action = {
  id: "export" | ActionPanel;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const leftActions: Action[] = [
  { id: "export", label: "Export Report", icon: DownloadIcon },
  { id: "automations", label: "Workflow Rules", icon: BoltIcon }
];

const rightActions: Action[] = [
  { id: "statistics", label: "Metrics", icon: StatsIcon },
  { id: "settings", label: "Configuration", icon: SettingsIcon }
];

type ActionBarProps = {
  activePanel: ActionPanel | null;
  onExport: () => void;
  onOpenPanel: (panel: ActionPanel) => void;
};

function ActionButton({
  action,
  activePanel,
  onExport,
  onOpenPanel
}: {
  action: Action;
  activePanel: ActionPanel | null;
  onExport: () => void;
  onOpenPanel: (panel: ActionPanel) => void;
}) {
  const { id, label, icon: Icon } = action;
  const isActive = id !== "export" && activePanel === id;

  return (
    <button
      type="button"
      aria-pressed={id === "export" ? undefined : isActive}
      onClick={() => (id === "export" ? onExport() : onOpenPanel(id))}
      className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-[12px] border px-4 text-[15px] font-medium transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 ${
        isActive
          ? "border-[#2563EB] bg-[#2563EB] text-white focus-visible:ring-[#2563EB]"
          : "border-[#E5E7EB] bg-[#FFFFFF] text-[#111827] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] focus-visible:ring-[#2563EB]"
      }`}
    >
      <Icon className="h-[18px] w-[18px]" />
      <span>{label}</span>
    </button>
  );
}

export function ActionBar({ activePanel, onExport, onOpenPanel }: ActionBarProps) {
  return (
    <div className="motion-fade-up motion-delay-2 flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-3">
        {leftActions.map((action) => (
          <ActionButton
            key={action.id}
            action={action}
            activePanel={activePanel}
            onExport={onExport}
            onOpenPanel={onOpenPanel}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {rightActions.map((action) => (
          <ActionButton
            key={action.id}
            action={action}
            activePanel={activePanel}
            onExport={onExport}
            onOpenPanel={onOpenPanel}
          />
        ))}
      </div>
    </div>
  );
}
