import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { Node, Link, GraphData, DEFAULT_MIN_WEIGHT, TEAM_COLORS, nodeId, linkId } from "./types";

interface UseGraphSimulationOptions {
  data: GraphData | null;
  svgRef: React.RefObject<SVGSVGElement | null>;
  setSelected: React.Dispatch<React.SetStateAction<string | null>>;
  setHovered: React.Dispatch<React.SetStateAction<string | null>>;
}

function seedPosition(id: string, max: number, offset: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return offset + (Math.abs(h) % max);
}

export function useGraphSimulation({
  data,
  svgRef,
  setSelected,
  setHovered,
}: UseGraphSimulationOptions) {
  const simRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const nodesRef = useRef<Node[]>([]);
  const gRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    const pad = 40;

    const nodes: Node[] = data.nodes.map((d) => ({
      ...d,
      x: seedPosition(d.id, width * 0.6, width * 0.2),
      y: seedPosition(d.id + "_y", height * 0.6, height * 0.2),
    }));
    nodesRef.current = nodes;
    const allLinks: Link[] = data.links.map((d) => ({ ...d }));

    const simulation = d3
      .forceSimulation<Node>(nodes)
      .force(
        "link",
        d3
          .forceLink<Node, Link>(allLinks)
          .id((d) => d.id)
          .distance((d) => 200 * (1 - d.weight) + 30)
          .strength((d) =>
            d.weight >= DEFAULT_MIN_WEIGHT ? 0.3 + d.weight * 0.7 : 0
          )
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30))
      .force("bounds", () => {
        for (const d of nodes) {
          if (d.x! < pad) d.vx! += (pad - d.x!) * 0.1;
          if (d.x! > width - pad) d.vx! -= (d.x! - (width - pad)) * 0.1;
          if (d.y! < pad) d.vy! += (pad - d.y!) * 0.1;
          if (d.y! > height - pad) d.vy! -= (d.y! - (height - pad)) * 0.1;
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

    const margin = 150;
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 3])
        .translateExtent([
          [-margin, -margin],
          [width + margin, height + margin],
        ])
        .on("zoom", (event) => g.attr("transform", event.transform))
    );

    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll<SVGLineElement, Link>("line")
      .data(allLinks, (d) => `${nodeId(d.source)}-${nodeId(d.target)}`)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", (d) =>
        d.weight >= DEFAULT_MIN_WEIGHT ? 0.4 : 0
      )
      .attr("stroke-width", (d) => Math.max(1, d.weight * 4));

    const degree = new Map<string, number>();
    allLinks.forEach((l) => {
      if (l.weight >= DEFAULT_MIN_WEIGHT) {
        const { s, t } = linkId(l);
        degree.set(s, (degree.get(s) || 0) + 1);
        degree.set(t, (degree.get(t) || 0) + 1);
      }
    });
    const maxDegree = Math.max(...(degree.size ? degree.values() : [1]), 1);

    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll<SVGGElement, Node>("g")
      .data(nodes, (d) => d.id)
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

    // Hover tooltip
    const tooltip = svg
      .append("g")
      .attr("class", "tooltip")
      .attr("pointer-events", "none")
      .style("opacity", 0);

    tooltip
      .append("rect")
      .attr("rx", 6)
      .attr("ry", 6)
      .attr("fill", "rgba(24,24,27,0.92)")
      .attr("stroke", "rgba(63,63,70,0.5)");

    const tooltipName = tooltip
      .append("text")
      .attr("fill", "#e5e7eb")
      .attr("font-size", "12px")
      .attr("font-weight", "600");

    const tooltipRole = tooltip
      .append("text")
      .attr("fill", "#a1a1aa")
      .attr("font-size", "11px");

    const tooltipTeam = tooltip
      .append("text")
      .attr("fill", "#71717a")
      .attr("font-size", "10px");

    node
      .on("mouseenter", function (event, d) {
        setHovered(d.id);
        const [mx, my] = d3.pointer(event, svg.node()!);

        tooltipName.text(d.name);
        tooltipRole.text(d.role);
        tooltipTeam.text(
          d.team.charAt(0).toUpperCase() + d.team.slice(1) + " team"
        );

        const padX = 12;
        const padY = 8;
        const lineH = 16;
        const textW = Math.max(
          d.name.length * 7.2,
          d.role.length * 6.6,
          (d.team.length + 5) * 6
        );
        const w = textW + padX * 2;
        const h = lineH * 3 + padY * 2;

        let tx = mx + 14;
        let ty = my - h - 8;
        const svgW = svgRef.current?.clientWidth || 800;
        if (tx + w > svgW - 10) tx = mx - w - 14;
        if (ty < 10) ty = my + 20;

        tooltip.attr("transform", `translate(${tx},${ty})`);
        tooltip.select("rect").attr("width", w).attr("height", h);
        tooltipName.attr("x", padX).attr("y", padY + lineH);
        tooltipRole.attr("x", padX).attr("y", padY + lineH * 2);
        tooltipTeam.attr("x", padX).attr("y", padY + lineH * 2.85);

        tooltip.transition().duration(150).style("opacity", 1);
      })
      .on("mouseleave", function () {
        setHovered(null);
        tooltip.transition().duration(150).style("opacity", 0);
      })
      .on("click", (_event, d) => {
        setSelected((prev) => (prev === d.id ? null : d.id));
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
      simRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return { gRef, simRef, nodesRef };
}
