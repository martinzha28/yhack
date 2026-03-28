import { Node, RankedConnection, TEAM_COLORS } from "./types";

interface InfoPanelProps {
  node: Node;
  connections: RankedConnection[];
  onClose: () => void;
}

export default function InfoPanel({ node, connections, onClose }: InfoPanelProps) {
  return (
    <div className="absolute top-4 right-4 bg-zinc-800/90 rounded-lg px-5 py-4 text-sm text-zinc-200 w-72 max-h-[80vh] overflow-y-auto space-y-3">
      <div>
        <div className="font-semibold text-base">{node.name}</div>
        <div className="text-zinc-400">{node.role}</div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: TEAM_COLORS[node.team] || "#6b7280",
            }}
          />
          <span className="capitalize">{node.team}</span>
        </div>
      </div>

      {node.expertise.length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
            Expertise
          </div>
          <div className="flex flex-wrap gap-1">
            {node.expertise.map((e) => (
              <span
                key={e}
                className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300"
              >
                {e}
              </span>
            ))}
          </div>
        </div>
      )}

      {node.projects.length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
            Projects
          </div>
          <div className="flex flex-wrap gap-1">
            {node.projects.map((p) => (
              <span
                key={p}
                className="px-2 py-0.5 bg-zinc-700/70 rounded text-xs text-zinc-300"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {connections.length > 0 && (
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
            Closest collaborators
          </div>
          <div className="space-y-1.5">
            {connections.slice(0, 8).map((c, i) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 w-4 text-right">
                  {i + 1}.
                </span>
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: TEAM_COLORS[c.team] || "#6b7280",
                  }}
                />
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-xs text-zinc-500 tabular-nums">
                  {(c.weight * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
