import Link from "next/link";
import { TEAM_COLORS } from "./types";

export default function ProjectLegend() {
  return (
    <div className="absolute top-4 left-4 bg-zinc-800/80 rounded-lg px-4 py-3 text-sm text-zinc-300 space-y-1.5">
      <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
        Teams
      </div>
      {Object.entries(TEAM_COLORS).map(([team, color]) => (
        <div key={team} className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="capitalize">{team}</span>
        </div>
      ))}
      <div className="text-xs text-zinc-600 pt-1">
        Circle fill = team mix
      </div>
      <div className="pt-2 border-t border-zinc-700/50">
        <Link
          href="/"
          className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors flex items-center gap-1"
        >
          <span>←</span>
          <span>People Graph</span>
        </Link>
      </div>
    </div>
  );
}
