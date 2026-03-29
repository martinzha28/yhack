import { Node, RankedConnection, TEAM_COLORS, roleStyle } from "./types";

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
    <div className="absolute top-4 right-4 bg-white border border-slate-200 shadow-lg rounded-xl px-5 py-4 text-sm text-slate-800 w-76 max-h-[85vh] overflow-y-auto space-y-4">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-base leading-tight text-slate-900">
            {node.name}
          </div>
          <div className="text-slate-500 text-xs mt-0.5">{node.role}</div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: TEAM_COLORS[node.team] || "#94a3b8" }}
            />
            <span className="capitalize text-xs text-slate-500">
              {node.team}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0 mt-0.5 cursor-pointer"
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 1l12 12M13 1L1 13"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* ── Skills summary ───────────────────────────────────────── */}
      {node.skills_summary && (
        <div>
          <SectionLabel>Skills</SectionLabel>
          <p className="text-xs text-slate-600 leading-relaxed mt-1">
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
                className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-700"
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
                    <span className="truncate text-xs text-slate-700 capitalize">
                      {projId.replace(/-/g, " ")}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize flex-shrink-0 font-medium ${bg} ${text}`}
                    >
                      {role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 tabular-nums w-7 text-right">
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
                className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-700"
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
          <p className="text-xs text-slate-600 leading-relaxed mt-1">
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
                <span className="text-xs text-slate-300 w-4 text-right tabular-nums">
                  {i + 1}.
                </span>
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: TEAM_COLORS[c.team] || "#94a3b8" }}
                />
                <span className="flex-1 truncate text-slate-700">{c.name}</span>
                <span className="text-xs text-slate-400 tabular-nums">
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
    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
      {children}
    </div>
  );
}
