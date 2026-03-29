"use client";

import { useState, useCallback, useRef } from "react";
import OrgGraph from "./components/OrgGraph";
import ProjectGraph from "./components/ProjectGraph";
import ViewSwitcher, { ViewMode } from "./components/graph/ViewSwitcher";
import ChatPanel from "./components/graph/ChatPanel";

import { ThemeProvider } from "./components/ThemeContext";

export default function Home() {
  const [view, setView] = useState<ViewMode>("people");
  const [chatHighlight, setChatHighlight] = useState<Set<string> | null>(null);
  const selectNodeRef = useRef<((id: string) => void) | null>(null);

  const handleHighlight = useCallback((ids: Set<string> | null) => {
    setChatHighlight(ids);
  }, []);

  const handleSelectNode = useCallback((id: string) => {
    selectNodeRef.current?.(id);
  }, []);

  const handleClearHighlight = useCallback(() => {
    setChatHighlight(null);
  }, []);

  return (
    <ThemeProvider>
      <div className="w-screen h-screen flex">
        <div className="flex-1 relative min-w-0">
          {view === "people" && (
            <OrgGraph
              chatHighlight={chatHighlight}
              onRegisterSelect={(fn) => {
                selectNodeRef.current = fn;
              }}
              onClearHighlight={handleClearHighlight}
            />
          )}
          {view === "projects" && (
            <ProjectGraph
              chatHighlight={chatHighlight}
              onClearHighlight={handleClearHighlight}
            />
          )}

          {/* ViewSwitcher — top-left */}
          <div className="absolute top-4 left-4 z-20">
            <ViewSwitcher active={view} onChange={setView} />
          </div>

          {/* Logo — top-center, click to reset */}
          <img
            src="/hoponboard.png"
            alt="HopOnBoard"
            onClick={() => {
              setView("people");
              setChatHighlight(null);
              selectNodeRef.current = null;
            }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-10 h-28 object-contain opacity-80 select-none cursor-pointer hover:opacity-100 transition-opacity"
          />
        </div>
        <ChatPanel
          onHighlight={handleHighlight}
          onSelectNode={handleSelectNode}
        />
      </div>
    </ThemeProvider>
  );
}
