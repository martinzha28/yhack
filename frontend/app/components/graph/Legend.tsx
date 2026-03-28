import { TEAM_COLORS } from "./types";

export default function Legend() {
  return (
    <div className="absolute top-4 left-4 bg-zinc-800/80 rounded-lg px-4 py-3 text-sm text-zinc-300 space-y-1">
      {Object.entries(TEAM_COLORS).map(([team, color]) => (
        <div key={team} className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="capitalize">{team}</span>
        </div>
      ))}
    </div>
  );
}
