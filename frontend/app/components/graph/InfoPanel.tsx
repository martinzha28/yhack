import { Node, RankedConnection, TEAM_COLORS } from "./types";

const ROLE_STYLES: Record<string, { bg: string; text: string }> = {
  lead: { bg: "bg-indigo-500/20", text: "text-indigo-300" },
  core: { bg: "bg-emerald-500/20", text: "text-emerald-300" },
  contributor: { bg: "bg-zinc-600/50", text: "text-zinc-400" },
  peripheral: { bg: "bg-zinc-700/50", text: "text-zinc-500" },
};

function roleStyle(role: string) {
  return ROLE_STYLES[role.toLowerCase()] ?? ROLE_STYLES.contributor;
}

interface InfoPanelProps {
  node: Node;
  connections: RankedConnection[];
  onClose: () => void;
}

export default function InfoPanel({
  node,
  connections,
  onClose,
}: InfoPanelProps) {
  const projectRoleEntries = node.project_roles
    ? Object.entries(node.project_roles).sort(
        (a, b) => b[1].weight - a[1].weight,
      )
    : [];

  const hasProjectRoles = projectRoleEntries.length > 0;

  return (
    <div className="absolute top-4 right-4 bg-zinc-800/90 backdrop-blur-sm rounded-xl px-5 py-4 text-sm text-zinc-200 w-76 max-h-[85vh] overflow-y-auto space-y-4 shadow-xl ring-1 ring-white/5">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-base leading-tight">
            {node.name}
          </div>
          <div className="text-zinc-400 text-xs mt-0.5">{node.role}</div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: TEAM_COLORS[node.team] || "#6b7280" }}
            />
            <span className="capitalize text-xs text-zinc-400">
              {node.team}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0 mt-0.5 cursor-pointer"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 1l12 12M13 1L1 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* ── Skills summary ───────────────────────────────────────── */}
      {node.skills_summary && (
        <div>
          <SectionLabel>Skills</SectionLabel>
          <p className="text-xs text-zinc-300 leading-relaxed mt-1">
            {node.skills_summary}
          </p>
        </div>
      )}

      {/* ── Expertise chips ──────────────────────────────────────── */}
      {node.expertise.length > 0 && (
        <div>
          <SectionLabel>Expertise</SectionLabel>
          <div className="flex flex-wrap gap-1 mt-1">
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

      {/* ── Projects ─────────────────────────────────────────────── */}
      {hasProjectRoles ? (
        <div>
          <SectionLabel>Projects</SectionLabel>
          <div className="space-y-2.5 mt-1">
            {projectRoleEntries.map(([projId, { weight, role }]) => {
              const { bg, text } = roleStyle(role);
              const pct = Math.round(weight * 100);
              return (
                <div key={projId}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="truncate text-xs text-zinc-200 capitalize">
                      {projId.replace(/-/g, " ")}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize flex-shrink-0 font-medium ${bg} ${text}`}
                    >
                      {role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-zinc-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500 tabular-nums w-7 text-right">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : node.projects.length > 0 ? (
        <div>
          <SectionLabel>Projects</SectionLabel>
          <div className="flex flex-wrap gap-1 mt-1">
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
      ) : null}

      {/* ── Work summary ─────────────────────────────────────────── */}
      {node.work_summary && (
        <div>
          <SectionLabel>Working With</SectionLabel>
          <p className="text-xs text-zinc-300 leading-relaxed mt-1">
            {node.work_summary}
          </p>
        </div>
      )}

      {/* ── Closest collaborators ────────────────────────────────── */}
      {connections.length > 0 && (
        <div>
          <SectionLabel>Closest collaborators</SectionLabel>
          <div className="space-y-1.5 mt-1">
            {connections.slice(0, 8).map((c, i) => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="text-xs text-zinc-600 w-4 text-right tabular-nums">
                  {i + 1}.
                </span>
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: TEAM_COLORS[c.team] || "#6b7280" }}
                />
                <span className="flex-1 truncate text-zinc-300">{c.name}</span>
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
      {children}
    </div>
  );
}
