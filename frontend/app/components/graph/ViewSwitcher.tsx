"use client";

import { useTheme } from "../ThemeContext";

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
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      className={`absolute top-4 left-4 rounded-lg p-1 flex gap-1 ${
        isDark ? "bg-zinc-800/90" : "bg-white border border-slate-200 shadow-sm"
      }`}
    >
      {VIEWS.map((v) => (
        <button
          key={v.id}
          onClick={() => onChange(v.id)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
            active === v.id
              ? isDark
                ? "bg-zinc-600 text-zinc-100"
                : "bg-slate-100 text-slate-900 shadow-sm"
              : isDark
                ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          }`}
          title={v.description}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
