"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  GraphData,
  RankedConnection,
  DEFAULT_MIN_WEIGHT,
  linkId,
} from "./graph/types";
import { useGraphSimulation } from "./graph/useGraphSimulation";
import { useGraphEffects } from "./graph/useGraphEffects";
import Legend from "./graph/Legend";
import SearchBar from "./graph/SearchBar";
import SettingsPanel from "./graph/SettingsPanel";
import InfoPanel from "./graph/InfoPanel";

interface OrgGraphProps {
  chatHighlight?: Set<string> | null;
  onRegisterSelect?: (fn: (id: string) => void) => void;
  onClearHighlight?: () => void;
}

export default function OrgGraph({
  chatHighlight,
  onRegisterSelect,
  onClearHighlight,
}: OrgGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const [data, setData] = useState<GraphData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [minWeight, setMinWeight] = useState(DEFAULT_MIN_WEIGHT);
  const hadSelection = useRef(false);

  useEffect(() => {
    if (selected !== null) {
      hadSelection.current = true;
    } else if (hadSelection.current) {
      hadSelection.current = false;
      onClearHighlight?.();
    }
  }, [selected, onClearHighlight]);
  const [search, setSearch] = useState("");
  const [showEdges, setShowEdges] = useState(true);
  const [clustering, setClustering] = useState(true);

  useEffect(() => {
    fetch("/graph.json")
      .then((r) => r.json())
      .then(setData);
  }, []);

  useEffect(() => {
    onRegisterSelect?.((id: string) => setSelected(id));
  }, [onRegisterSelect]);

  const { gRef, simRef } = useGraphSimulation({
    data,
    svgRef,
    setSelected,
    setHovered,
    clustering,
    onBackgroundClick: onClearHighlight,
  });

  const nodeMap = useMemo(() => {
    if (!data) return new Map();
    return new Map(data.nodes.map((n) => [n.id, n]));
  }, [data]);

  const searchMatch = useMemo(() => {
    if (!search.trim() || !data) return null;
    const q = search.toLowerCase();
    const matches = data.nodes
      .filter(
        (n) =>
          n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q),
      )
      .map((n) => n.id);
    return new Set(matches);
  }, [search, data]);

  const rankedConnections = useMemo<RankedConnection[]>(() => {
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
          name: other?.name || otherId,
          team: other?.team || "",
          weight: l.weight,
        };
      })
      .sort((a, b) => b.weight - a.weight);
  }, [data, selected, nodeMap, minWeight]);

  useGraphEffects({
    gRef,
    simRef,
    data,
    minWeight,
    selected,
    searchMatch,
    chatHighlight: chatHighlight ?? null,
    showEdges,
  });

  const selectedNode = data?.nodes.find((n) => n.id === selected);

  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full bg-slate-50" />
      <Legend />
      <SearchBar
        search={search}
        setSearch={setSearch}
        matchCount={searchMatch ? searchMatch.size : null}
      />
      <SettingsPanel
        minWeight={minWeight}
        setMinWeight={setMinWeight}
        showEdges={showEdges}
        setShowEdges={setShowEdges}
        clustering={clustering}
        setClustering={setClustering}
      />
      {selectedNode && (
        <InfoPanel
          node={selectedNode}
          connections={rankedConnections}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
