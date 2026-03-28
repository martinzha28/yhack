"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  role: string;
  team: string;
  expertise: string[];
  projects: string[];
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  weight: number;
}

interface GraphData {
  nodes: Node[];
  links: Link[];
}

interface RankedConnection {
  id: string;
  name: string;
  team: string;
  weight: number;
}

const TEAM_COLORS: Record<string, string> = {
  backend: "#3b82f6",
  frontend: "#10b981",
  design: "#f59e0b",
  product: "#ef4444",
};

const DEFAULT_MIN_WEIGHT = 0.1;

function linkId(l: Link): { s: string; t: string } {
  const s = typeof l.source === "string" ? l.source : l.source.id;
  const t = typeof l.target === "string" ? l.target : l.target.id;
  return { s, t };
}

export default function OrgGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<GraphData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [minWeight, setMinWeight] = useState(DEFAULT_MIN_WEIGHT);
  const [settingsOpen, setSettingsOpen] = useState(true);

  useEffect(() => {
    fetch("/graph.json")
      .then((r) => r.json())
      .then(setData);
  }, []);

  const nodeMap = useMemo(() => {
    if (!data) return new Map<string, Node>();
    return new Map(data.nodes.map((n) => [n.id, n]));
  }, [data]);

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

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const filteredLinks = data.links.filter((l) => l.weight >= minWeight);

    const degree = new Map<string, number>();
    filteredLinks.forEach((l) => {
      const { s, t } = linkId(l);
      degree.set(s, (degree.get(s) || 0) + 1);
      degree.set(t, (degree.get(t) || 0) + 1);
    });
    const maxDegree = Math.max(...degree.values(), 1);

    const nodes = data.nodes.map((d) => ({ ...d }));
    const links = filteredLinks.map((d) => ({ ...d }));

    const simulation = d3
      .forceSimulation<Node>(nodes)
      .force(
        "link",
        d3
          .forceLink<Node, Link>(links)
          .id((d) => d.id)
          .distance((d) => 200 * (1 - d.weight) + 30)
          .strength((d) => 0.3 + d.weight * 0.7)
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    const g = svg.append("g");

    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 4])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

    const link = g
      .append("g")
      .selectAll<SVGLineElement, Link>("line")
      .data(links)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", (d) => Math.max(1, d.weight * 4));

    const node = g
      .append("g")
      .selectAll<SVGGElement, Node>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, Node>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    node
      .append("circle")
      .attr("r", (d) => {
        const deg = degree.get(d.id) || 1;
        return 6 + (deg / maxDegree) * 14;
      })
      .attr("fill", (d) => TEAM_COLORS[d.team] || "#6b7280")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5);

    node
      .append("text")
      .text((d) => d.name.split(" ")[0])
      .attr("dy", (d) => {
        const deg = degree.get(d.id) || 1;
        return -(8 + (deg / maxDegree) * 14);
      })
      .attr("text-anchor", "middle")
      .attr("fill", "#e5e7eb")
      .attr("font-size", "11px")
      .attr("pointer-events", "none");

    node.on("click", (_event, d) => {
      const id = d.id;
      setSelected((prev) => (prev === id ? null : id));
    });

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as Node).x!)
        .attr("y1", (d) => (d.source as Node).y!)
        .attr("x2", (d) => (d.target as Node).x!)
        .attr("y2", (d) => (d.target as Node).y!);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [data, minWeight]);

  useEffect(() => {
    if (!svgRef.current || !data) return;
    const svg = d3.select(svgRef.current);

    if (!selected) {
      svg.selectAll("line").attr("stroke-opacity", 0.4);
      svg.selectAll("circle").attr("opacity", 1);
      svg.selectAll("text").attr("opacity", 1);
      return;
    }

    const connectedIds = new Set<string>();
    connectedIds.add(selected);
    data.links.forEach((l) => {
      const { s, t } = linkId(l);
      if (l.weight >= minWeight) {
        if (s === selected) connectedIds.add(t);
        if (t === selected) connectedIds.add(s);
      }
    });

    svg.selectAll<SVGLineElement, Link>("line").attr("stroke-opacity", (d) => {
      const { s, t } = linkId(d);
      return s === selected || t === selected ? 0.8 : 0.05;
    });

    svg.selectAll<SVGCircleElement, Node>("circle").attr("opacity", (d) =>
      connectedIds.has(d.id) ? 1 : 0.15
    );

    svg.selectAll<SVGTextElement, Node>("text").attr("opacity", (d) =>
      connectedIds.has(d.id) ? 1 : 0.1
    );
  }, [selected, data, minWeight]);

  const selectedNode = data?.nodes.find((n) => n.id === selected);

  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full bg-zinc-900" />

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-zinc-800/80 rounded-lg px-4 py-3 text-sm text-zinc-300 space-y-1">
        {Object.entries(TEAM_COLORS).map(([team, color]) => (
          <div key={team} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="capitalize">{team}</span>
          </div>
        ))}
      </div>

      {/* Settings panel */}
      <div className="absolute bottom-4 left-4 bg-zinc-800/90 rounded-lg text-sm text-zinc-300 w-64">
        <button
          onClick={() => setSettingsOpen((o) => !o)}
          className="w-full flex items-center justify-between px-4 py-2.5 cursor-pointer hover:text-zinc-100"
        >
          <span className="font-medium">Settings</span>
          <span className="text-xs text-zinc-500">
            {settingsOpen ? "▼" : "▶"}
          </span>
        </button>
        {settingsOpen && (
          <div className="px-4 pb-3 space-y-3 border-t border-zinc-700/50 pt-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-zinc-400">
                  Edge weight threshold
                </label>
                <span className="text-xs text-zinc-500 tabular-nums">
                  {minWeight.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={0.8}
                step={0.01}
                value={minWeight}
                onChange={(e) => setMinWeight(parseFloat(e.target.value))}
                className="w-full accent-zinc-400 h-1.5 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
                <span>More edges</span>
                <span>Fewer edges</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info panel */}
      {selectedNode && (
        <div className="absolute top-4 right-4 bg-zinc-800/90 rounded-lg px-5 py-4 text-sm text-zinc-200 w-72 max-h-[80vh] overflow-y-auto space-y-3">
          <div>
            <div className="font-semibold text-base">{selectedNode.name}</div>
            <div className="text-zinc-400">{selectedNode.role}</div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor:
                    TEAM_COLORS[selectedNode.team] || "#6b7280",
                }}
              />
              <span className="capitalize">{selectedNode.team}</span>
            </div>
          </div>

          {selectedNode.expertise.length > 0 && (
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
                Expertise
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedNode.expertise.map((e) => (
                  <span
                    key={e}
                    className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300"
                  >
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selectedNode.projects.length > 0 && (
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
                Projects
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedNode.projects.map((p) => (
                  <span
                    key={p}
                    className="px-2 py-0.5 bg-zinc-700/70 rounded text-xs text-zinc-300"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {rankedConnections.length > 0 && (
            <div>
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
                Closest collaborators
              </div>
              <div className="space-y-1.5">
                {rankedConnections.slice(0, 8).map((c, i) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 w-4 text-right">
                      {i + 1}.
                    </span>
                    <span
                      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: TEAM_COLORS[c.team] || "#6b7280",
                      }}
                    />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-xs text-zinc-500 tabular-nums">
                      {(c.weight * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setSelected(null)}
            className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
          >
            Click node again or here to deselect
          </button>
        </div>
      )}
    </div>
  );
}
