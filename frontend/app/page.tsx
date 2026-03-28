"use client";

import { useState } from "react";
import OrgGraph from "./components/OrgGraph";
import ProjectGraph from "./components/ProjectGraph";
import ViewSwitcher, { ViewMode } from "./components/graph/ViewSwitcher";

export default function Home() {
  const [view, setView] = useState<ViewMode>("people");

  return (
    <div className="w-screen h-screen relative">
      {view === "people" && <OrgGraph />}
      {view === "projects" && <ProjectGraph />}
      <ViewSwitcher active={view} onChange={setView} />
    </div>
  );
}
