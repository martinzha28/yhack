import { useState } from "react";

interface SettingsPanelProps {
  minWeight: number;
  setMinWeight: (value: number) => void;
  showEdges: boolean;
  setShowEdges: (value: boolean) => void;
  clustering: boolean;
  setClustering: (value: boolean) => void;
}

export default function SettingsPanel({
  minWeight,
  setMinWeight,
  showEdges,
  setShowEdges,
  clustering,
  setClustering,
}: SettingsPanelProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="absolute bottom-4 right-4 bg-white border border-slate-200 shadow-md rounded-xl text-sm text-slate-700 w-64">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-slate-50 rounded-xl transition-colors"
      >
        <span className="font-semibold text-slate-700 tracking-tight">
          Settings
        </span>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-3">
          {/* Edge weight threshold */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-500">
                Edge weight threshold
              </label>
              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
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
              className="w-full accent-blue-600 h-1.5 cursor-pointer rounded-full"
            />
            <div className="flex justify-between text-[10px] text-slate-300 mt-1">
              <span>More edges</span>
              <span>Fewer edges</span>
            </div>
          </div>

          {/* Show edges toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-500">
              Show edges
            </label>
            <Toggle value={showEdges} onChange={setShowEdges} />
          </div>

          {/* Project clusters toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-500">
              Project clusters
            </label>
            <Toggle value={clustering} onChange={setClustering} />
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 ${
        value ? "bg-blue-600" : "bg-slate-200"
      }`}
      role="switch"
      aria-checked={value}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
          value ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
