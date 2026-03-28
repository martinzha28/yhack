interface SearchBarProps {
  search: string;
  setSearch: (value: string) => void;
  matchCount: number | null;
}

export default function SearchBar({ search, setSearch, matchCount }: SearchBarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2">
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search people..."
          className="bg-zinc-800/90 text-zinc-200 text-sm rounded-lg pl-9 pr-8 py-2 w-64 placeholder:text-zinc-500 border border-zinc-700/50 focus:outline-none focus:border-zinc-500 transition-colors"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
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
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
      {matchCount !== null && search && (
        <div className="text-center text-xs text-zinc-500 mt-1">
          {matchCount} {matchCount === 1 ? "match" : "matches"}
        </div>
      )}
    </div>
  );
}
