import { ProjectInfo, ConnectedProject, TEAM_COLORS, STATUS_COLORS, roleStyle } from "./types";

interface ProjectInfoPanelProps {
  project: ProjectInfo;
  connectedProjects: ConnectedProject[];
  onClose: () => void;
}

export default function ProjectInfoPanel({
  project,
  connectedProjects,
  onClose,
}: ProjectInfoPanelProps) {
  const statusColor = STATUS_COLORS[project.status] || "#6b7280";

  return (
    <div className="absolute top-4 right-4 bg-zinc-800/90 backdrop-blur-sm rounded-xl px-5 py-4 text-sm text-zinc-200 w-76 max-h-[85vh] overflow-y-auto space-y-4 shadow-xl ring-1 ring-white/5">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-base leading-tight">
            {project.display_name}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full border-2 flex-shrink-0"
              style={{
                borderColor: statusColor,
                backgroundColor: statusColor + "26",
              }}
            />
            <span className="capitalize text-xs text-zinc-400">
              {project.status}
            </span>
            {project.time_range && (
              <span className="text-zinc-500 text-xs">· {project.time_range}</span>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0 mt-0.5 cursor-pointer"
          aria-label="Close panel"
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

      {/* ── topics ─────────────────────────────────────────────────── */}
      {project.keywords.length > 0 && (
        <div>
          <SectionLabel>Topics</SectionLabel>
          <div className="flex flex-wrap gap-1 mt-1">
            {project.keywords.slice(0, 10).map((k) => (
              <span
                key={k}
                className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Team ───────────────────────────────────────────────────── */}
      {project.members.length > 0 && (
        <div>
          <SectionLabel>
            Team · {project.member_count}{" "}
            {project.member_count === 1 ? "person" : "people"}
          </SectionLabel>
          <div className="space-y-2.5 mt-1">
            {project.members.map((m, i) => {
              const { bg, text } = roleStyle(m.role);
              const pct = Math.round(m.weight * 100);
              return (
                <div key={m.id}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs text-zinc-600 w-4 text-right tabular-nums flex-shrink-0">
                        {i + 1}.
                      </span>
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: TEAM_COLORS[m.team] || "#6b7280",
                        }}
                      />
                      <span className="text-xs text-zinc-200 truncate">
                        {m.name}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize flex-shrink-0 font-medium ${bg} ${text}`}
                    >
                      {m.role}
                    </span>
                  </div>

                  {/* Weight bar indented to align under the name */}
                  <div className="flex items-center gap-2 pl-7">
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
      )}

      {/* ── Connected Projects ──────────────────────────────────────── */}
      {connectedProjects.length > 0 && (
        <div>
          <SectionLabel>Connected Projects</SectionLabel>
          <div className="space-y-3 mt-1">
            {connectedProjects.slice(0, 6).map((cp) => (
              <div key={cp.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-zinc-200 truncate">
                    {cp.name}
                  </span>
                  <span className="text-[10px] text-zinc-500 flex-shrink-0 tabular-nums">
                    {cp.shared_count} shared
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {cp.shared_people.slice(0, 4).map((sp) => (
                    <span
                      key={sp.id}
                      className="flex items-center gap-1 text-[10px] text-zinc-300 bg-zinc-700/60 px-1.5 py-0.5 rounded"
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: TEAM_COLORS[sp.team] || "#6b7280",
                        }}
                      />
                      {sp.name}
                    </span>
                  ))}
                </div>
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
