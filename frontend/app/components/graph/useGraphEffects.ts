import { useEffect } from "react";
import * as d3 from "d3";
import { Node, Link, GraphData, TRANSITION_MS, linkId } from "./types";

interface UseGraphEffectsOptions {
  gRef: React.RefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>;
  simRef: React.RefObject<d3.Simulation<Node, Link> | null>;
  data: GraphData | null;
  minWeight: number;
  selected: string | null;
  searchMatch: Set<string> | null;
  showEdges: boolean;
}

export function useGraphEffects({
  gRef,
  simRef,
  data,
  minWeight,
  selected,
  searchMatch,
  showEdges,
}: UseGraphEffectsOptions) {
  // Smooth threshold transitions
  useEffect(() => {
    if (!gRef.current || !data || !simRef.current) return;

    const g = gRef.current;
    const simulation = simRef.current;

    const linkForce = simulation.force("link") as d3.ForceLink<Node, Link>;
    if (linkForce) {
      linkForce.strength((d) =>
        d.weight >= minWeight ? 0.3 + d.weight * 0.7 : 0
      );
    }
    simulation.alpha(0.15).restart();

    g.select(".links")
      .selectAll<SVGLineElement, Link>("line")
      .transition()
      .duration(TRANSITION_MS)
      .attr("stroke-opacity", (d) => (d.weight >= minWeight && showEdges ? 0.4 : 0));

    const degree = new Map<string, number>();
    data.links.forEach((l) => {
      if (l.weight >= minWeight) {
        const { s, t } = linkId(l);
        degree.set(s, (degree.get(s) || 0) + 1);
        degree.set(t, (degree.get(t) || 0) + 1);
      }
    });
    const maxDegree = Math.max(...(degree.size ? degree.values() : [1]), 1);

    g.select(".nodes")
      .selectAll<SVGGElement, Node>("g")
      .select("circle")
      .transition()
      .duration(TRANSITION_MS)
      .attr("r", (d: Node) => {
        const deg = degree.get(d.id) || 1;
        return 6 + (deg / maxDegree) * 14;
      });

    g.select(".nodes")
      .selectAll<SVGGElement, Node>("g")
      .select("text")
      .transition()
      .duration(TRANSITION_MS)
      .attr("dy", (d: Node) => {
        const deg = degree.get(d.id) || 1;
        return -(8 + (deg / maxDegree) * 14);
      });
  }, [minWeight, data, gRef, simRef]);

  // Selection + search highlighting
  useEffect(() => {
    if (!gRef.current || !data) return;
    const g = gRef.current;

    const activeHighlight = selected || (searchMatch && searchMatch.size > 0);

    if (!activeHighlight) {
      g.select(".links")
        .selectAll<SVGLineElement, Link>("line")
        .transition()
        .duration(200)
        .attr("stroke", "#999")
        .attr("stroke-opacity", (d) => (d.weight >= minWeight && showEdges ? 0.4 : 0));

      g.select(".nodes")
        .selectAll<SVGGElement, Node>("g")
        .select("circle")
        .transition()
        .duration(200)
        .attr("opacity", 1)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5);

      g.select(".nodes")
        .selectAll<SVGGElement, Node>("g")
        .select("text")
        .transition()
        .duration(200)
        .attr("opacity", 1);

      return;
    }

    const highlightedIds = new Set<string>();

    if (selected) {
      highlightedIds.add(selected);
      data.links.forEach((l) => {
        const { s, t } = linkId(l);
        if (l.weight >= minWeight) {
          if (s === selected) highlightedIds.add(t);
          if (t === selected) highlightedIds.add(s);
        }
      });
    }

    if (searchMatch) {
      searchMatch.forEach((id) => highlightedIds.add(id));
    }

    g.select(".links")
      .selectAll<SVGLineElement, Link>("line")
      .transition()
      .duration(200)
      .attr("stroke-opacity", (d) => {
        if (!showEdges || d.weight < minWeight) return 0;
        const { s, t } = linkId(d);
        if (selected && (s === selected || t === selected)) return 0.8;
        if (searchMatch && searchMatch.has(s) && searchMatch.has(t)) return 0.6;
        return 0.05;
      });

    g.select(".nodes")
      .selectAll<SVGGElement, Node>("g")
      .select("circle")
      .transition()
      .duration(200)
      .attr("opacity", (d: Node) => (highlightedIds.has(d.id) ? 1 : 0.12))
      .attr("stroke", (d: Node) =>
        searchMatch && searchMatch.has(d.id) ? "#facc15" : "#fff"
      )
      .attr("stroke-width", (d: Node) =>
        searchMatch && searchMatch.has(d.id) ? 3 : 1.5
      );

    g.select(".nodes")
      .selectAll<SVGGElement, Node>("g")
      .select("text")
      .transition()
      .duration(200)
      .attr("opacity", (d: Node) => (highlightedIds.has(d.id) ? 1 : 0.08));
  }, [selected, searchMatch, data, minWeight, showEdges, gRef]);
}
