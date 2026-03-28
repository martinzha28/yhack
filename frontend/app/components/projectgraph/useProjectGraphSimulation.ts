import { useEffect, useRef } from "react";
import * as d3 from "d3";
import {
  ProjectNode,
  ProjectLink,
  ProjectGraphData,
  TeamSlice,
  TEAM_COLORS,
  DEFAULT_MIN_WEIGHT,
  nodeId,
  nodeRadius,
} from "./types";

interface UseProjectGraphSimulationOptions {
  data: ProjectGraphData | null;
  svgRef: React.RefObject<SVGSVGElement | null>;
  setSelected: React.Dispatch<React.SetStateAction<string | null>>;
  setHovered: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useProjectGraphSimulation({
  data,
  svgRef,
  setSelected,
  setHovered,
}: UseProjectGraphSimulationOptions) {
  const simRef = useRef<d3.Simulation<ProjectNode, ProjectLink> | null>(null);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const pad = 80;

    const nodes: ProjectNode[] = data.nodes.map((d) => ({ ...d }));
    const allLinks: ProjectLink[] = data.links.map((d) => ({ ...d }));

    const maxMemberCount = Math.max(...nodes.map((n) => n.member_count), 1);

    const simulation = d3
      .forceSimulation<ProjectNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<ProjectNode, ProjectLink>(allLinks)
          .id((d) => d.id)
          .distance((d) => 320 * (1 - d.weight) + 100)
          .strength((d) => (d.weight >= DEFAULT_MIN_WEIGHT ? 0.3 + d.weight * 0.5 : 0))
      )
      .force("charge", d3.forceManyBody().strength(-700))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide<ProjectNode>().radius(
          (d) => nodeRadius(d.member_count, maxMemberCount) + 24
        )
      )
      .force("bounds", () => {
        for (const d of nodes) {
          d.x = Math.max(pad, Math.min(width - pad, d.x!));
          d.y = Math.max(pad, Math.min(height - pad, d.y!));
        }
      });

    simRef.current = simulation;

    const g = svg.append("g");
    gRef.current = g;

    // Invisible background rect to catch clicks on empty space
    g.append("rect")
      .attr("width", width * 3)
      .attr("height", height * 3)
      .attr("x", -width)
      .attr("y", -height)
      .attr("fill", "transparent")
      .on("click", () => setSelected(null));

    const margin = 250;
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .translateExtent([
          [-margin, -margin],
          [width + margin, height + margin],
        ])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

    // ── Links ──────────────────────────────────────────────────────────────
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll<SVGLineElement, ProjectLink>("line")
      .data(allLinks, (d) => `${nodeId(d.source)}-${nodeId(d.target)}`)
      .join("line")
      .attr("stroke", "#6b7280")
      .attr("stroke-opacity", (d) =>
        d.weight >= DEFAULT_MIN_WEIGHT ? Math.max(0.25, d.weight * 0.85) : 0
      )
      .attr("stroke-width", (d) => Math.max(1.5, d.weight * 7));

    // Shared-member count labels on links
    const linkLabel = g
      .append("g")
      .attr("class", "link-labels")
      .selectAll<SVGTextElement, ProjectLink>("text")
      .data(allLinks.filter((d) => d.weight >= DEFAULT_MIN_WEIGHT))
      .join("text")
      .attr("text-anchor", "middle")
      .attr("fill", "#9ca3af")
      .attr("font-size", "10px")
      .attr("pointer-events", "none")
      .text((d) => `${d.shared_members}`);

    // ── Nodes ──────────────────────────────────────────────────────────────
    const pieGen = d3
      .pie<TeamSlice>()
      .value((d) => d.proportion)
      .sort(null); // preserve insertion order (already sorted by count desc)

    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, ProjectNode>("g")
      .data(nodes, (d) => d.id)
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
          })
      );

    // Render pie-chart slices and stroke ring for each node
    node.each(function (d: ProjectNode) {
      const r = nodeRadius(d.member_count, maxMemberCount);
      const group = d3.select(this);
      const slices = pieGen(d.team_distribution);

      const arcGen = d3
        .arc<d3.PieArcDatum<TeamSlice>>()
        .innerRadius(0)
        .outerRadius(r);

      // Pie slices (one per team represented on the project)
      group
        .selectAll<SVGPathElement, d3.PieArcDatum<TeamSlice>>("path.team-slice")
        .data(slices)
        .join("path")
        .attr("class", "team-slice")
        .attr("d", arcGen)
        .attr("fill", (pd) => TEAM_COLORS[pd.data.team] ?? "#6b7280");

      // White stroke ring drawn on top of the slices
      group
        .append("circle")
        .attr("class", "node-stroke")
        .attr("r", r)
        .attr("fill", "none")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1.5);
    });

    // Project name labels, floating just above each node
    node
      .append("text")
      .attr("class", "node-label")
      .text((d) => d.name)
      .attr("dy", (d) => -(nodeRadius(d.member_count, maxMemberCount) + 7))
      .attr("text-anchor", "middle")
      .attr("fill", "#e5e7eb")
      .attr("font-size", "11px")
      .attr("pointer-events", "none");

    // ── Tooltip ────────────────────────────────────────────────────────────
    const tooltip = svg
      .append("g")
      .attr("class", "tooltip")
      .attr("pointer-events", "none")
      .style("opacity", 0);

    tooltip
      .append("rect")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("fill", "rgba(24,24,27,0.93)")
      .attr("stroke", "rgba(63,63,70,0.5)");

    const tipName = tooltip
      .append("text")
      .attr("fill", "#e5e7eb")
      .attr("font-size", "12px")
      .attr("font-weight", "600");

    const tipMembers = tooltip
      .append("text")
      .attr("fill", "#a1a1aa")
      .attr("font-size", "11px");

    const tipStatus = tooltip
      .append("text")
      .attr("fill", "#71717a")
      .attr("font-size", "10px");

    node
      .on("mouseenter", function (event, d) {
        setHovered(d.id);
        const [mx, my] = d3.pointer(event, svg.node()!);

        tipName.text(d.name);
        tipMembers.text(`${d.member_count} members`);
        tipStatus.text(
          d.status === "completed"
            ? `Completed · ${d.time_range}`
            : "Active"
        );

        const padX = 12;
        const padY = 8;
        const lineH = 16;
        const statusText =
          d.status === "completed" ? `Completed · ${d.time_range}` : "Active";
        const textW = Math.max(
          d.name.length * 7.2,
          `${d.member_count} members`.length * 6.6,
          statusText.length * 6.0
        );
        const w = textW + padX * 2;
        const h = lineH * 3 + padY * 2;

        let tx = mx + 14;
        let ty = my - h - 8;
        const svgW = svgRef.current?.clientWidth ?? 800;
        if (tx + w > svgW - 10) tx = mx - w - 14;
        if (ty < 10) ty = my + 20;

        tooltip.attr("transform", `translate(${tx},${ty})`);
        tooltip.select("rect").attr("width", w).attr("height", h);
        tipName.attr("x", padX).attr("y", padY + lineH);
        tipMembers.attr("x", padX).attr("y", padY + lineH * 2);
        tipStatus.attr("x", padX).attr("y", padY + lineH * 2.85);

        tooltip.transition().duration(150).style("opacity", 1);
      })
      .on("mouseleave", function () {
        setHovered(null);
        tooltip.transition().duration(150).style("opacity", 0);
      })
      .on("click", (_event, d) => {
        setSelected((prev) => (prev === d.id ? null : d.id));
      });

    // ── Tick ───────────────────────────────────────────────────────────────
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as ProjectNode).x!)
        .attr("y1", (d) => (d.source as ProjectNode).y!)
        .attr("x2", (d) => (d.target as ProjectNode).x!)
        .attr("y2", (d) => (d.target as ProjectNode).y!);

      linkLabel
        .attr(
          "x",
          (d) =>
            ((d.source as ProjectNode).x! + (d.target as ProjectNode).x!) / 2
        )
        .attr(
          "y",
          (d) =>
            ((d.source as ProjectNode).y! + (d.target as ProjectNode).y!) / 2 -
            4
        );

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
      simRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return { gRef, simRef };
}
