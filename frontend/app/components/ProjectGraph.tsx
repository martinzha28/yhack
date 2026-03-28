"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  ProjectGraphData,
  RankedProjectConnection,
  DEFAULT_MIN_WEIGHT,
  linkId,
} from "./projectgraph/types";
import { useProjectGraphSimulation } from "./projectgraph/useProjectGraphSimulation";
import { useProjectGraphEffects } from "./projectgraph/useProjectGraphEffects";
import ProjectLegend from "./projectgraph/ProjectLegend";
import ProjectSearchBar from "./projectgraph/ProjectSearchBar";
import ProjectSettingsPanel from "./projectgraph/ProjectSettingsPanel";
import ProjectInfoPanel from "./projectgraph/ProjectInfoPanel";

export default function ProjectGraph() {
  const svgRef = useRef<SVGSVGElement>(null);

  const [data, setData] = useState<ProjectGraphData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [minWeight, setMinWeight] = useState(DEFAULT_MIN_WEIGHT);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/project_graph.json")
      .then((r) => r.json())
      .then(setData);
  }, []);

  const { gRef, simRef } = useProjectGraphSimulation({
    data,
    svgRef,
    setSelected,
    setHovered,
  });

  const nodeMap = useMemo(() => {
    if (!data) return new Map();
    return new Map(data.nodes.map((n) => [n.id, n]));
  }, [data]);

  // Match against project name, id, and keywords
  const searchMatch = useMemo(() => {
    if (!search.trim() || !data) return null;
    const q = search.toLowerCase();
    const matches = data.nodes
      .filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q) ||
          n.keywords.some((k) => k.toLowerCase().includes(q))
      )
      .map((n) => n.id);
    return new Set(matches);
  }, [search, data]);

  const rankedConnections = useMemo<RankedProjectConnection[]>(() => {
    if (!data || !selected) return [];
    return data.links
      .filter((l) => {
        const { s, t } = linkId(l);
        return (s === selected || t === selected) && l.weight >= minWeight;
      })
      .map((l) => {
        const { s, t } = linkId(l);
        const otherId = s === selected ? t : s;
        const other = nodeMap.get(otherId);
        return {
          id: otherId,
          name: other?.name ?? otherId,
          shared_members: l.shared_members,
          weight: l.weight,
        };
      })
      .sort((a, b) => b.weight - a.weight);
  }, [data, selected, nodeMap, minWeight]);

  useProjectGraphEffects({ gRef, simRef, data, minWeight, selected, searchMatch });

  // suppress unused-variable warning — hovered is kept for future use
  void hovered;

  const selectedNode = data?.nodes.find((n) => n.id === selected);

  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full bg-zinc-900" />
      <ProjectLegend />
      <ProjectSearchBar
        search={search}
        setSearch={setSearch}
        matchCount={searchMatch ? searchMatch.size : null}
      />
      <ProjectSettingsPanel minWeight={minWeight} setMinWeight={setMinWeight} />
      {selectedNode && (
        <ProjectInfoPanel
          node={selectedNode}
          connections={rankedConnections}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
