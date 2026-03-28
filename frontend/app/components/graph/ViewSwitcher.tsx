export type ViewMode = "people" | "projects";

interface ViewSwitcherProps {
  active: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const VIEWS: { id: ViewMode; label: string; description: string }[] = [
  { id: "people", label: "People", description: "Who talks to who" },
  { id: "projects", label: "Projects", description: "Shared contributors" },
];

export default function ViewSwitcher({ active, onChange }: ViewSwitcherProps) {
  return (
    <div className="absolute top-4 left-4 bg-zinc-800/90 rounded-lg p-1 flex gap-1">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          onClick={() => onChange(v.id)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            active === v.id
              ? "bg-zinc-600 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
          }`}
          title={v.description}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
