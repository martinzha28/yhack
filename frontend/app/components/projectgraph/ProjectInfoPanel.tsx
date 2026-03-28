import { ProjectNode, RankedProjectConnection, TeamSlice, TEAM_COLORS } from "./types";

interface ProjectInfoPanelProps {
  node: ProjectNode;
  connections: RankedProjectConnection[];
  onClose: () => void;
}

export default function ProjectInfoPanel({
  node,
  connections,
  onClose,
}: ProjectInfoPanelProps) {
  return (
    <div className="absolute top-4 right-4 bg-zinc-800/90 rounded-lg px-5 py-4 text-sm text-zinc-200 w-72 max-h-[80vh] overflow-y-auto space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-base leading-tight">{node.name}</div>
          <div className="text-zinc-400 text-xs mt-0.5">
            {node.status === "completed"
              ? `Completed · ${node.time_range}`
              : "Active"}
          </div>
          <div className="text-zinc-500 text-xs mt-0.5">
            {node.member_count} member{node.member_count !== 1 ? "s" : ""}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer mt-0.5 flex-shrink-0"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Team breakdown */}
      {node.team_distribution.length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">
            Team Breakdown
          </div>

          {/* Proportional colour bar */}
          <div className="h-2.5 rounded-full overflow-hidden flex mb-2">
            {node.team_distribution.map((slice: TeamSlice) => (
              <div
                key={slice.team}
                style={{
                  width: `${slice.proportion * 100}%`,
                  backgroundColor: TEAM_COLORS[slice.team] ?? "#6b7280",
                }}
              />
            ))}
          </div>

          {/* Per-team rows */}
          <div className="space-y-1.5">
            {node.team_distribution.map((slice: TeamSlice) => (
              <div key={slice.team} className="flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: TEAM_COLORS[slice.team] ?? "#6b7280",
                  }}
                />
                <span className="capitalize flex-1 text-zinc-300">
                  {slice.team}
                </span>
                <span className="text-xs text-zinc-400 tabular-nums">
                  {slice.count}
                </span>
                <span className="text-xs text-zinc-500 tabular-nums w-9 text-right">
                  {(slice.proportion * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related projects */}
      {connections.length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5">
            Related Projects
          </div>
          <div className="space-y-1.5">
            {connections.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="text-xs text-zinc-600 w-4 text-right flex-shrink-0">
                  {i + 1}.
                </span>
                <span className="flex-1 truncate text-zinc-300">{c.name}</span>
                <span className="text-xs text-zinc-500 tabular-nums flex-shrink-0">
                  {c.shared_members} shared
                </span>
                <span className="text-xs text-zinc-600 tabular-nums w-8 text-right flex-shrink-0">
                  {(c.weight * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keywords */}
      {node.keywords.length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1.5">
            Keywords
          </div>
          <div className="flex flex-wrap gap-1">
            {node.keywords.slice(0, 10).map((k) => (
              <span
                key={k}
                className="px-2 py-0.5 bg-zinc-700/80 rounded text-xs text-zinc-300"
              >
                {k}
              </span>
            ))}
            {node.keywords.length > 10 && (
              <span className="px-2 py-0.5 text-xs text-zinc-600">
                +{node.keywords.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
