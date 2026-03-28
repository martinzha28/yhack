import { useState } from "react";

interface SettingsPanelProps {
  minWeight: number;
  setMinWeight: (value: number) => void;
}

export default function SettingsPanel({ minWeight, setMinWeight }: SettingsPanelProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="absolute bottom-4 left-4 bg-zinc-800/90 rounded-lg text-sm text-zinc-300 w-64">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer hover:text-zinc-100"
      >
        <span className="font-medium">Settings</span>
        <span className="text-xs text-zinc-500">{open ? "▼" : "▶"}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-3 border-t border-zinc-700/50 pt-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-zinc-400">
                Edge weight threshold
              </label>
              <span className="text-xs text-zinc-500 tabular-nums">
                {minWeight.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={0.8}
              step={0.01}
              value={minWeight}
              onChange={(e) => setMinWeight(parseFloat(e.target.value))}
              className="w-full accent-zinc-400 h-1.5 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
              <span>More edges</span>
              <span>Fewer edges</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
