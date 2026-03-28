import * as d3 from "d3";

export interface TeamSlice {
  team: string;
  count: number;
  proportion: number;
}

export interface ProjectNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  members: string[];
  member_count: number;
  status: string;
  time_range: string;
  keywords: string[];
  team_distribution: TeamSlice[];
}

export interface ProjectLink extends d3.SimulationLinkDatum<ProjectNode> {
  source: string | ProjectNode;
  target: string | ProjectNode;
  shared_members: number;
  weight: number;
}

export interface ProjectGraphData {
  nodes: ProjectNode[];
  links: ProjectLink[];
}

export interface RankedProjectConnection {
  id: string;
  name: string;
  shared_members: number;
  weight: number;
}

export const TEAM_COLORS: Record<string, string> = {
  backend: "#3b82f6",
  frontend: "#10b981",
  design: "#f59e0b",
  product: "#ef4444",
};

export const DEFAULT_MIN_WEIGHT = 0.0;
export const TRANSITION_MS = 400;

export function nodeRadius(memberCount: number, maxMemberCount: number): number {
  return 14 + (memberCount / maxMemberCount) * 18;
}

export function nodeId(d: string | ProjectNode): string {
  return typeof d === "string" ? d : d.id;
}

export function linkId(l: ProjectLink): { s: string; t: string } {
  return { s: nodeId(l.source), t: nodeId(l.target) };
}
