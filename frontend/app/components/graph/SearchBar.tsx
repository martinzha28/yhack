"use client";

import { useTheme } from "../ThemeContext";

interface SearchBarProps {
  search: string;
  setSearch: (value: string) => void;
  matchCount: number | null;
}

export default function SearchBar({
  search,
  setSearch,
  matchCount,
}: SearchBarProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search people..."
          className={`text-sm rounded-lg pl-9 pr-8 py-2 w-64 focus:outline-none transition-all ${
            isDark
              ? "bg-zinc-800/90 text-zinc-200 placeholder:text-zinc-500 border border-zinc-700/50 focus:border-zinc-500"
              : "bg-white text-slate-800 placeholder:text-slate-400 border border-slate-300 shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          }`}
        />
        <svg
          className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
            isDark ? "text-zinc-500" : "text-slate-400"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" strokeLinecap="round" />
        </svg>
        {search && (
          <button
            onClick={() => setSearch("")}
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isDark
                ? "text-zinc-500 hover:text-zinc-300"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            }`}
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
      {matchCount !== null && search && (
        <div
          className={`text-center text-xs mt-1 ${
            isDark ? "text-zinc-500" : "text-slate-400"
          }`}
        >
          {matchCount} {matchCount === 1 ? "match" : "matches"}
        </div>
      )}
    </div>
  );
}
