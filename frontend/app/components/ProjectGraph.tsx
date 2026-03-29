"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import {
  ProjectInfo,
  SharedPerson,
  ConnectedProject,
  STATUS_COLORS,
} from "./graph/types";
import ProjectInfoPanel from "./graph/ProjectInfoPanel";

// ── Local simulation types ────────────────────────────────────────────────────
// ProjectInfo holds the plain data shape; ProjectNode adds d3 simulation fields.

interface ProjectNode extends d3.SimulationNodeDatum, ProjectInfo {}

interface ProjectLink extends d3.SimulationLinkDatum<ProjectNode> {
  source: string | ProjectNode;
  target: string | ProjectNode;
  weight: number;
  shared_count: number;
  shared_people: SharedPerson[];
}

interface ProjectGraphData {
  nodes: ProjectNode[];
  links: ProjectLink[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_MIN_SHARED = 1;

// ── Helpers ───────────────────────────────────────────────────────────────────

function seedPosition(id: string, max: number, offset: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return offset + (Math.abs(h) % max);
}

function nodeId(d: string | ProjectNode): string {
  return typeof d === "string" ? d : d.id;
}

function linkId(l: ProjectLink): { s: string; t: string } {
  return { s: nodeId(l.source), t: nodeId(l.target) };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProjectGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<ProjectGraphData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [minShared, setMinShared] = useState(DEFAULT_MIN_SHARED);
  const [showEdges, setShowEdges] = useState(true);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/project_graph.json")
      .then((r) => r.json())
      .then(setData);
  }, []);

  // ── D3 simulation ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const pad = 80;

    const filteredLinks = data.links.filter((l) => l.shared_count >= minShared);
    const maxMembers = Math.max(...data.nodes.map((n) => n.member_count), 1);

    const nodes: ProjectNode[] = data.nodes.map((d) => ({
      ...d,
      x: seedPosition(d.id, width * 0.6, width * 0.2),
      y: seedPosition(d.id + "_y", height * 0.6, height * 0.2),
    }));
    const links: ProjectLink[] = filteredLinks.map((d) => ({ ...d }));

    const nodeRadius = (d: ProjectNode) =>
      14 + (d.member_count / maxMembers) * 26;

    const simulation = d3
      .forceSimulation<ProjectNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<ProjectNode, ProjectLink>(links)
          .id((d) => d.id)
          .distance((d) => 160 * (1 - d.weight) + 80)
          .strength((d) => 0.2 + d.weight * 0.5),
      )
      .force("charge", d3.forceManyBody().strength(-600).distanceMax(400))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(0.1))
      .force(
        "collision",
        d3.forceCollide().radius((d) => nodeRadius(d as ProjectNode) + 30),
      )
      .force("bounds", () => {
        for (const d of nodes) {
          if (d.x! < pad) d.vx! += (pad - d.x!) * 0.1;
          if (d.x! > width - pad) d.vx! -= (d.x! - (width - pad)) * 0.1;
          if (d.y! < pad) d.vy! += (pad - d.y!) * 0.1;
          if (d.y! > height - pad) d.vy! -= (d.y! - (height - pad)) * 0.1;
        }
      });

    // ── SVG scaffold ──────────────────────────────────────────────────────────
    const g = svg.append("g");

    // Transparent backdrop to deselect on empty-canvas click
    g.append("rect")
      .attr("width", width * 3)
      .attr("height", height * 3)
      .attr("x", -width)
      .attr("y", -height)
      .attr("fill", "transparent")
      .on("click", () => setSelected(null));

    const margin = 150;
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 3])
        .translateExtent([
          [-margin, -margin],
          [width + margin, height + margin],
        ])
        .on("zoom", (event) => g.attr("transform", event.transform)),
    );

    // ── Edges ─────────────────────────────────────────────────────────────────
    const link = g
      .append("g")
      .selectAll<SVGLineElement, ProjectLink>("line")
      .data(links)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", showEdges ? 0.4 : 0)
      .attr("stroke-width", (d) => Math.max(1.5, d.weight * 8));

    // Shared-count pill labels on edges
    const linkLabelGroup = g
      .append("g")
      .attr("class", "link-labels")
      .style("opacity", showEdges ? 1 : 0)
      .selectAll<SVGGElement, ProjectLink>("g")
      .data(links.filter((l) => l.shared_count > 0))
      .join("g")
      .attr("pointer-events", "none");

    linkLabelGroup
      .append("rect")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("width", 20)
      .attr("height", 16)
      .attr("x", -10)
      .attr("y", -10)
      .attr("fill", "rgba(24,24,27,0.85)");

    linkLabelGroup
      .append("text")
      .text((d) => d.shared_count.toString())
      .attr("text-anchor", "middle")
      .attr("dy", "0.3em")
      .attr("fill", "#a1a1aa")
      .attr("font-size", "10px")
      .attr("font-weight", "500");

    // ── Nodes ─────────────────────────────────────────────────────────────────
    const node = g
      .append("g")
      .selectAll<SVGGElement, ProjectNode>("g")
      .data(nodes)
      .join("g")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, ProjectNode>()
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
          }),
      );

    node
      .append("circle")
      .attr("r", (d) => nodeRadius(d))
      .attr("fill", (d) => STATUS_COLORS[d.status] || "#6b7280")
      .attr("fill-opacity", 0.15)
      .attr("stroke", (d) => STATUS_COLORS[d.status] || "#6b7280")
      .attr("stroke-width", 2);

    // Use display_name (parentheticals already stripped in Python)
    node
      .append("text")
      .text((d) => d.display_name)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("fill", "#e5e7eb")
      .attr("font-size", "11px")
      .attr("font-weight", "500")
      .attr("pointer-events", "none");

    // Member count sub-label
    node
      .append("text")
      .text(
        (d) =>
          `${d.member_count} ${d.member_count === 1 ? "person" : "people"}`,
      )
      .attr("text-anchor", "middle")
      .attr("dy", "1.8em")
      .attr("fill", "#71717a")
      .attr("font-size", "9px")
      .attr("pointer-events", "none");

    node.on("click", (_event, d) => {
      setSelected((prev) => (prev === d.id ? null : d.id));
    });

    // ── Tick ──────────────────────────────────────────────────────────────────
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as ProjectNode).x!)
        .attr("y1", (d) => (d.source as ProjectNode).y!)
        .attr("x2", (d) => (d.target as ProjectNode).x!)
        .attr("y2", (d) => (d.target as ProjectNode).y!);

      linkLabelGroup.attr("transform", (d) => {
        const s = d.source as ProjectNode;
        const t = d.target as ProjectNode;
        return `translate(${(s.x! + t.x!) / 2},${(s.y! + t.y!) / 2})`;
      });

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [data, minShared]);

  // ── Selection highlighting ─────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current || !data) return;
    const svg = d3.select(svgRef.current);

    if (!selected) {
      svg.selectAll("line").attr("stroke-opacity", showEdges ? 0.4 : 0);
      svg.select(".link-labels").style("opacity", showEdges ? 1 : 0);
      svg.selectAll<SVGGElement, ProjectNode>("g > circle").attr("opacity", 1);
      svg.selectAll<SVGGElement, ProjectNode>("g > text").attr("opacity", 1);
      return;
    }

    const connected = new Set<string>([selected]);
    data.links.forEach((l) => {
      const { s, t } = linkId(l);
      if (l.shared_count >= minShared) {
        if (s === selected) connected.add(t);
        if (t === selected) connected.add(s);
      }
    });

    svg
      .selectAll<SVGLineElement, ProjectLink>("line")
      .attr("stroke-opacity", (d) => {
        if (!showEdges) return 0;
        const { s, t } = linkId(d);
        return s === selected || t === selected ? 0.8 : 0.05;
      });

    svg.select(".link-labels").style("opacity", showEdges ? 1 : 0);

    svg
      .selectAll<SVGGElement, ProjectNode>("g")
      .selectAll<SVGCircleElement, ProjectNode>("circle")
      .attr("opacity", function () {
        const d = d3
          .select(this.parentNode as SVGGElement)
          .datum() as ProjectNode;
        return d ? (connected.has(d.id) ? 1 : 0.15) : 1;
      });

    svg
      .selectAll<SVGGElement, ProjectNode>("g")
      .selectAll<SVGTextElement, ProjectNode>("text")
      .attr("opacity", function () {
        const d = d3
          .select(this.parentNode as SVGGElement)
          .datum() as ProjectNode;
        return d ? (connected.has(d.id) ? 1 : 0.1) : 1;
      });
  }, [selected, data, minShared, showEdges]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const selectedProject = data?.nodes.find((n) => n.id === selected) ?? null;

  const connectedProjects = useMemo<ConnectedProject[]>(() => {
    if (!data || !selected) return [];
    return data.links
      .filter((l) => {
        const { s, t } = linkId(l);
        return (
          (s === selected || t === selected) && l.shared_count >= minShared
        );
      })
      .map((l) => {
        const { s, t } = linkId(l);
        const otherId = s === selected ? t : s;
        const other = data.nodes.find((n) => n.id === otherId);
        return {
          id: otherId,
          // display_name is the clean label; fall back gracefully for old data
          name: other?.display_name ?? other?.name ?? otherId,
          weight: l.weight,
          shared_count: l.shared_count,
          shared_people: l.shared_people,
        };
      })
      .sort((a, b) => b.shared_count - a.shared_count);
  }, [data, selected, minShared]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full">
      <svg ref={svgRef} className="w-full h-full bg-zinc-900" />

      {/* Status legend */}
      <div className="absolute top-14 left-4 bg-zinc-800/80 rounded-lg px-4 py-3 text-sm text-zinc-300 space-y-1">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-full border-2"
              style={{ borderColor: color, backgroundColor: color + "26" }}
            />
            <span className="capitalize">{status}</span>
          </div>
        ))}
        <div className="text-[10px] text-zinc-500 pt-1">
          Node size = team size
        </div>
        <div className="text-[10px] text-zinc-500">
          Edge label = shared people
        </div>
      </div>

      {/* Threshold controls */}
      <div className="absolute bottom-4 left-4 bg-zinc-800/90 rounded-lg px-4 py-3 text-sm text-zinc-300 w-64">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-zinc-400">Min shared people</label>
          <span className="text-xs text-zinc-500 tabular-nums">
            {minShared}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={minShared}
          onChange={(e) => setMinShared(parseInt(e.target.value))}
          className="w-full accent-zinc-400 h-1.5 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-zinc-600 mt-0.5">
          <span>All connections</span>
          <span>Strong only</span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <label className="text-xs text-zinc-400">Show edges</label>
          <button
            onClick={() => setShowEdges((v) => !v)}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
              showEdges ? "bg-indigo-500" : "bg-zinc-600"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                showEdges ? "translate-x-4" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Info panel */}
      {selectedProject && (
        <ProjectInfoPanel
          project={selectedProject}
          connectedProjects={connectedProjects}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
