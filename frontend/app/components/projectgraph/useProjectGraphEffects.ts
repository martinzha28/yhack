import { useEffect } from "react";
import * as d3 from "d3";
import {
  ProjectNode,
  ProjectLink,
  ProjectGraphData,
  TRANSITION_MS,
  DEFAULT_MIN_WEIGHT,
  linkId,
} from "./types";

interface UseProjectGraphEffectsOptions {
  gRef: React.RefObject<d3.Selection<SVGGElement, unknown, null, undefined> | null>;
  simRef: React.RefObject<d3.Simulation<ProjectNode, ProjectLink> | null>;
  data: ProjectGraphData | null;
  minWeight: number;
  selected: string | null;
  searchMatch: Set<string> | null;
}

export function useProjectGraphEffects({
  gRef,
  simRef,
  data,
  minWeight,
  selected,
  searchMatch,
}: UseProjectGraphEffectsOptions) {
  // ── Min-weight threshold transitions ──────────────────────────────────────
  useEffect(() => {
    if (!gRef.current || !data || !simRef.current) return;

    const g = gRef.current;
    const simulation = simRef.current;

    const linkForce = simulation.force("link") as d3.ForceLink<
      ProjectNode,
      ProjectLink
    >;
    if (linkForce) {
      linkForce.strength((d) =>
        d.weight >= minWeight ? 0.3 + d.weight * 0.5 : 0
      );
    }
    simulation.alpha(0.15).restart();

    g.select(".links")
      .selectAll<SVGLineElement, ProjectLink>("line")
      .transition()
      .duration(TRANSITION_MS)
      .attr("stroke-opacity", (d) =>
        d.weight >= minWeight ? Math.max(0.25, d.weight * 0.85) : 0
      );

    g.select(".link-labels")
      .selectAll<SVGTextElement, ProjectLink>("text")
      .transition()
      .duration(TRANSITION_MS)
      .attr("opacity", (d) => (d.weight >= minWeight ? 0.6 : 0));
  }, [minWeight, data, gRef, simRef]);

  // ── Selection + search highlighting ───────────────────────────────────────
  useEffect(() => {
    if (!gRef.current || !data) return;
    const g = gRef.current;

    const activeHighlight = selected || (searchMatch && searchMatch.size > 0);

    // ── Reset: no highlight active ──────────────────────────────────────────
    if (!activeHighlight) {
      g.select(".links")
        .selectAll<SVGLineElement, ProjectLink>("line")
        .transition()
        .duration(200)
        .attr("stroke", "#6b7280")
        .attr("stroke-opacity", (d) =>
          d.weight >= minWeight ? Math.max(0.25, d.weight * 0.85) : 0
        );

      g.select(".link-labels")
        .selectAll<SVGTextElement, ProjectLink>("text")
        .transition()
        .duration(200)
        .attr("opacity", (d) => (d.weight >= minWeight ? 0.6 : 0));

      g.select(".nodes")
        .selectAll<SVGGElement, ProjectNode>("g")
        .transition()
        .duration(200)
        .attr("opacity", 1);

      g.select(".nodes")
        .selectAll<SVGGElement, ProjectNode>("g")
        .select("circle.node-stroke")
        .transition()
        .duration(200)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1.5);

      g.select(".nodes")
        .selectAll<SVGGElement, ProjectNode>("g")
        .select("text.node-label")
        .transition()
        .duration(200)
        .attr("opacity", 1);

      return;
    }

    // ── Build the set of IDs that should be highlighted ─────────────────────
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

    // ── Links ────────────────────────────────────────────────────────────────
    g.select(".links")
      .selectAll<SVGLineElement, ProjectLink>("line")
      .transition()
      .duration(200)
      .attr("stroke-opacity", (d) => {
        if (d.weight < minWeight) return 0;
        const { s, t } = linkId(d);
        if (selected && (s === selected || t === selected)) return 0.9;
        if (searchMatch && searchMatch.has(s) && searchMatch.has(t)) return 0.7;
        return 0.05;
      });

    g.select(".link-labels")
      .selectAll<SVGTextElement, ProjectLink>("text")
      .transition()
      .duration(200)
      .attr("opacity", (d) => {
        if (d.weight < minWeight) return 0;
        const { s, t } = linkId(d);
        if (selected && (s === selected || t === selected)) return 0.9;
        if (searchMatch && searchMatch.has(s) && searchMatch.has(t)) return 0.7;
        return 0;
      });

    // ── Node group opacity (dims/highlights everything inside the <g>) ───────
    g.select(".nodes")
      .selectAll<SVGGElement, ProjectNode>("g")
      .transition()
      .duration(200)
      .attr("opacity", (d: ProjectNode) =>
        highlightedIds.has(d.id) ? 1 : 0.1
      );

    // ── Stroke highlight for search matches (yellow ring) ────────────────────
    g.select(".nodes")
      .selectAll<SVGGElement, ProjectNode>("g")
      .select("circle.node-stroke")
      .transition()
      .duration(200)
      .attr("stroke", (d: ProjectNode) =>
        searchMatch && searchMatch.has(d.id) ? "#facc15" : "#ffffff"
      )
      .attr("stroke-width", (d: ProjectNode) =>
        searchMatch && searchMatch.has(d.id) ? 3 : 1.5
      );

    // ── Label opacity follows node opacity ───────────────────────────────────
    g.select(".nodes")
      .selectAll<SVGGElement, ProjectNode>("g")
      .select("text.node-label")
      .transition()
      .duration(200)
      .attr("opacity", (d: ProjectNode) =>
        highlightedIds.has(d.id) ? 1 : 0.08
      );
  }, [selected, searchMatch, data, minWeight, gRef]);
}
