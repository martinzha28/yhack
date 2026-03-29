import { TEAM_COLORS } from "./types";

export default function Legend() {
  return (
    <div className="absolute top-14 left-4 bg-white/90 border border-slate-200 shadow-sm rounded-lg px-4 py-3 text-sm text-slate-700 space-y-1.5">
      {Object.entries(TEAM_COLORS).map(([team, color]) => (
        <div key={team} className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="capitalize">{team}</span>
        </div>
      ))}
    </div>
  );
}
