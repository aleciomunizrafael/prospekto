// Filtros da lista de leads a partir de searchParams (links e formulário GET).
import {
  LEAD_SEGMENTS,
  LEAD_SOURCES,
  LEAD_TEMPERATURES,
  type LeadSegment,
  type LeadSource,
  type LeadTemperature,
} from "@/lib/domain/enums";
import { isPipeline, isStageOf, type Pipeline } from "@/lib/domain/pipelines";
import { isLeadsView, type LeadsView } from "./leads-view";

export const LEADS_PAGE_SIZE = 25;
export const LEAD_SORTS = ["next_action", "created"] as const;
export type LeadSort = (typeof LEAD_SORTS)[number];

export type LeadFilters = {
  pipeline: Pipeline;
  stage?: string;
  segment?: LeadSegment;
  temperature?: LeadTemperature;
  source?: LeadSource;
  ownerUserId?: string;
  search?: string;
  includeLost: boolean;
  sort: LeadSort;
  page: number;
  // Visão explícita na URL (`?view=lista|quadro`); a resolução com o cookie fica em leads-view.ts.
  // Preservada nos links da lista para a "espiada" pelo "ver todos em Lista" do quadro continuar
  // na lista ao paginar ou filtrar (ADR-004, 6.2).
  view?: LeadsView;
};

type Params = Record<string, string | string[] | undefined>;

function one(params: Params, key: string): string | undefined {
  const v = params[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
}

export function parseLeadFilters(params: Params): LeadFilters {
  const p = one(params, "pipeline");
  const pipeline: Pipeline = p && isPipeline(p) ? p : "patrocinadores";
  const stage = one(params, "stage");
  const segment = one(params, "segment");
  const temperature = one(params, "temperature");
  const source = one(params, "source");
  const sort = one(params, "sort");
  const view = one(params, "view");
  const page = Number(one(params, "page") ?? "1");
  return {
    pipeline,
    stage: stage && isStageOf(pipeline, stage) ? stage : undefined,
    segment: (LEAD_SEGMENTS as readonly string[]).includes(segment ?? "")
      ? (segment as LeadSegment)
      : undefined,
    temperature: (LEAD_TEMPERATURES as readonly string[]).includes(temperature ?? "")
      ? (temperature as LeadTemperature)
      : undefined,
    source: (LEAD_SOURCES as readonly string[]).includes(source ?? "")
      ? (source as LeadSource)
      : undefined,
    ownerUserId: one(params, "owner"),
    search: one(params, "q")?.slice(0, 120),
    includeLost: one(params, "lost") === "1",
    sort: (LEAD_SORTS as readonly string[]).includes(sort ?? "")
      ? (sort as LeadSort)
      : "next_action",
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    view: isLeadsView(view) ? view : undefined,
  };
}

export function leadFiltersToQuery(f: Partial<LeadFilters>): string {
  const q = new URLSearchParams();
  if (f.pipeline) q.set("pipeline", f.pipeline);
  if (f.stage) q.set("stage", f.stage);
  if (f.segment) q.set("segment", f.segment);
  if (f.temperature) q.set("temperature", f.temperature);
  if (f.source) q.set("source", f.source);
  if (f.ownerUserId) q.set("owner", f.ownerUserId);
  if (f.search) q.set("q", f.search);
  if (f.includeLost) q.set("lost", "1");
  if (f.sort && f.sort !== "next_action") q.set("sort", f.sort);
  if (f.page && f.page > 1) q.set("page", String(f.page));
  if (f.view) q.set("view", f.view);
  const s = q.toString();
  return s ? `?${s}` : "";
}
