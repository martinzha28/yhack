import * as d3 from "d3";

export interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  role: string;
  team: string;
  expertise: string[];
  projects: string[];
}

export interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  weight: number;
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
}

export interface RankedConnection {
  id: string;
  name: string;
  team: string;
  weight: number;
}

export const TEAM_COLORS: Record<string, string> = {
  backend: "#3b82f6",
  frontend: "#10b981",
  design: "#f59e0b",
  product: "#ef4444",
};

export const PROJECT_PALETTE = [
  "#818cf8",
  "#34d399",
  "#fb923c",
  "#e879f9",
  "#38bdf8",
  "#f87171",
  "#a3e635",
  "#fbbf24",
];

export const DEFAULT_MIN_WEIGHT = 0.35;
export const TRANSITION_MS = 400;

export function nodeId(d: string | Node): string {
  return typeof d === "string" ? d : d.id;
}

export function linkId(l: Link): { s: string; t: string } {
  return { s: nodeId(l.source), t: nodeId(l.target) };
}
