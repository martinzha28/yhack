"use client";

import { useTheme } from "../ThemeContext";
import {
  ProjectInfo,
  ConnectedProject,
  TEAM_COLORS,
  STATUS_COLORS,
} from "./types";

// Role badge styles for both themes
const ROLE_STYLES_DARK: Record<string, { bg: string; text: string }> = {
  lead: { bg: "bg-indigo-500/20", text: "text-indigo-300" },
  core: { bg: "bg-emerald-500/20", text: "text-emerald-300" },
  contributor: { bg: "bg-zinc-600/50", text: "text-zinc-400" },
  peripheral: { bg: "bg-zinc-700/50", text: "text-zinc-500" },
};

const ROLE_STYLES_LIGHT: Record<string, { bg: string; text: string }> = {
  lead: { bg: "bg-indigo-50", text: "text-indigo-600" },
  core: { bg: "bg-emerald-50", text: "text-emerald-700" },
  contributor: { bg: "bg-slate-100", text: "text-slate-600" },
  peripheral: { bg: "bg-slate-50", text: "text-slate-400" },
};

function roleStyle(role: string, isDark: boolean) {
  const map = isDark ? ROLE_STYLES_DARK : ROLE_STYLES_LIGHT;
  return map[role.toLowerCase()] ?? map.contributor;
}

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
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const statusColor = STATUS_COLORS[project.status] || "#6b7280";

  return (
    <div
      className={`absolute top-4 right-4 rounded-xl px-5 py-4 text-sm w-76 max-h-[85vh] overflow-y-auto space-y-4 ${
        isDark
          ? "bg-zinc-800/90 backdrop-blur-sm text-zinc-200 shadow-xl ring-1 ring-white/5"
          : "bg-white border border-slate-200 shadow-lg text-slate-800"
      }`}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className={`font-semibold text-base leading-tight ${
              isDark ? "text-zinc-100" : "text-slate-900"
            }`}
          >
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
            <span
              className={`capitalize text-xs ${
                isDark ? "text-zinc-400" : "text-slate-500"
              }`}
            >
              {project.status}
            </span>
            {project.time_range && (
              <span
                className={`text-xs ${
                  isDark ? "text-zinc-500" : "text-slate-400"
                }`}
              >
                · {project.time_range}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className={`flex-shrink-0 mt-0.5 cursor-pointer transition-colors rounded-full w-6 h-6 flex items-center justify-center ${
            isDark
              ? "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700"
              : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          }`}
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

      {/* ── Summary ────────────────────────────────────────────────── */}
      {project.summary && (
        <p
          className={`text-xs leading-relaxed ${
            isDark ? "text-zinc-300" : "text-slate-600"
          }`}
        >
          {project.summary}
        </p>
      )}

      {/* ── Topics ─────────────────────────────────────────────────── */}
      {project.keywords.length > 0 && (
        <div>
          <SectionLabel isDark={isDark}>Topics</SectionLabel>
          <div className="flex flex-wrap gap-1 mt-1">
            {project.keywords.slice(0, 10).map((k) => (
              <span
                key={k}
                className={`px-2 py-0.5 rounded text-xs ${
                  isDark
                    ? "bg-zinc-700 text-zinc-300"
                    : "bg-slate-100 text-slate-700"
                }`}
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
          <SectionLabel isDark={isDark}>
            Team · {project.member_count}{" "}
            {project.member_count === 1 ? "person" : "people"}
          </SectionLabel>
          <div className="space-y-2.5 mt-1">
            {project.members.map((m, i) => {
              const { bg, text } = roleStyle(m.role, isDark);
              const pct = Math.round(m.weight * 100);
              return (
                <div key={m.id}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`text-xs w-4 text-right tabular-nums flex-shrink-0 ${
                          isDark ? "text-zinc-600" : "text-slate-400"
                        }`}
                      >
                        {i + 1}.
                      </span>
                      <span
                        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: TEAM_COLORS[m.team] || "#6b7280",
                        }}
                      />
                      <span
                        className={`text-xs truncate ${
                          isDark ? "text-zinc-200" : "text-slate-700"
                        }`}
                      >
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
                    <div
                      className={`flex-1 h-1 rounded-full overflow-hidden ${
                        isDark ? "bg-zinc-700" : "bg-slate-200"
                      }`}
                    >
                      <div
                        className={`h-full rounded-full transition-all ${
                          isDark ? "bg-zinc-400" : "bg-blue-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span
                      className={`text-[10px] tabular-nums w-7 text-right ${
                        isDark ? "text-zinc-500" : "text-slate-400"
                      }`}
                    >
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
          <SectionLabel isDark={isDark}>Connected Projects</SectionLabel>
          <div className="space-y-3 mt-1">
            {connectedProjects.slice(0, 6).map((cp) => (
              <div key={cp.id}>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-medium truncate ${
                      isDark ? "text-zinc-200" : "text-slate-700"
                    }`}
                  >
                    {cp.name}
                  </span>
                  <span
                    className={`text-[10px] flex-shrink-0 tabular-nums ${
                      isDark ? "text-zinc-500" : "text-slate-400"
                    }`}
                  >
                    {cp.shared_count} shared
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {cp.shared_people.slice(0, 4).map((sp) => (
                    <span
                      key={sp.id}
                      className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                        isDark
                          ? "text-zinc-300 bg-zinc-700/60"
                          : "text-slate-600 bg-slate-100"
                      }`}
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

function SectionLabel({
  children,
  isDark,
}: {
  children: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <div
      className={`text-[10px] font-semibold uppercase tracking-widest ${
        isDark ? "text-zinc-500" : "text-slate-400"
      }`}
    >
      {children}
    </div>
  );
}
