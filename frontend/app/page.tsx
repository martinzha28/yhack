"use client";

import { useState, useCallback, useRef } from "react";
import OrgGraph from "./components/OrgGraph";
import ProjectGraph from "./components/ProjectGraph";
import ViewSwitcher, { ViewMode } from "./components/graph/ViewSwitcher";
import ChatPanel from "./components/graph/ChatPanel";

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
    <div className="w-screen h-screen flex">
      <ChatPanel onHighlight={handleHighlight} onSelectNode={handleSelectNode} />
      <div className="flex-1 relative min-w-0">
        {view === "people" && (
          <OrgGraph chatHighlight={chatHighlight} onRegisterSelect={(fn) => { selectNodeRef.current = fn; }} onClearHighlight={handleClearHighlight} />
        )}
        {view === "projects" && (
          <ProjectGraph chatHighlight={chatHighlight} onClearHighlight={handleClearHighlight} />
        )}
        <ViewSwitcher active={view} onChange={setView} />
      </div>
    </div>
  );
}
