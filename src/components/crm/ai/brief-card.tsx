"use client";

import { Copy, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { useActionState, useState } from "react";
import { toast } from "sonner";
import { generateBriefAction } from "@/actions/ai-brief";
import { Callout } from "@/components/crm/ui/callout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Brief, BriefDeadline } from "@/lib/ai/brief";
import { initialAiActionState, type AiActionState, type AiRunSnapshot } from "@/lib/ai/types";
import { formatDateTime } from "@/lib/crm/format";

// "Preparar ligação" (ADR-003, frente 1; ia-plano.md, Frente A). Abre com o último briefing
// gravado em ai_runs (`initial`, decisão P2) ou vazio com um único botão; a Server Action só roda
// no clique e "Gerar de novo" sempre chama. Nada é gravado em activities. Só tipos vêm de
// src/lib/ai/brief.ts: zod e os prompts ficam no servidor.
export type BriefCardProps = {
  leadId: string;
  enabled: boolean;
  initial: AiRunSnapshot | null;
};

const DEADLINE_LABELS: Record<BriefDeadline, string> = {
  hoje: "hoje",
  amanha: "amanhã",
  esta_semana: "esta semana",
  proxima_semana: "semana que vem",
};

const NOTE = "Sugestão da IA a partir do histórico do CRM. Confira antes de usar.";

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && !!v) : [];

// O `output` de ai_runs chega como JSON genérico; aqui vira Brief sem zod (nunca lança). Um
// registro de versão anterior do esquema vira, no pior caso, um cartão com listas vazias.
function briefFromSnapshot(snapshot: AiRunSnapshot | null): Brief | null {
  if (!snapshot) return null;
  const o = snapshot.output as Record<string, unknown>;
  if (typeof o.resumo !== "string" || typeof o.gancho_abertura !== "string") return null;
  const next = (o.proximo_passo ?? {}) as Record<string, unknown>;
  const prazo =
    String(next.prazo) in DEADLINE_LABELS ? (next.prazo as BriefDeadline) : "esta_semana";
  return {
    resumo: o.resumo,
    gancho_abertura: o.gancho_abertura,
    pontos_atencao: strings(o.pontos_atencao),
    perguntas: strings(o.perguntas),
    objecoes_provaveis: Array.isArray(o.objecoes_provaveis)
      ? o.objecoes_provaveis.filter(
          (i): i is Brief["objecoes_provaveis"][number] =>
            !!i &&
            typeof i === "object" &&
            typeof (i as { objecao?: unknown }).objecao === "string" &&
            typeof (i as { resposta?: unknown }).resposta === "string",
        )
      : [],
    proximo_passo: { acao: typeof next.acao === "string" ? next.acao : "", prazo },
    lacunas: strings(o.lacunas),
  };
}

function SectionTitle({ children }: { children: string }) {
  return <h3 className="crm-eyebrow">{children}</h3>;
}

function BriefBody({ brief, briefKey }: { brief: Brief; briefKey: string }) {
  const copyHook = () => {
    navigator.clipboard.writeText(brief.gancho_abertura).then(
      () => toast.success("Copiado."),
      () => toast.error("Não foi possível copiar."),
    );
  };
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1">
        <SectionTitle>Resumo</SectionTitle>
        <p className="text-sm">{brief.resumo}</p>
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle>Gancho de abertura</SectionTitle>
        <blockquote className="border-l-[3px] border-l-brand pl-3 text-sm">
          {brief.gancho_abertura}
        </blockquote>
        <div>
          <Button type="button" variant="outline" size="sm" onClick={copyHook}>
            <Copy aria-hidden="true" />
            Copiar
          </Button>
        </div>
      </section>

      {brief.pontos_atencao.length ? (
        <section className="flex flex-col gap-1">
          <SectionTitle>Pontos de atenção</SectionTitle>
          <ul className="flex flex-col gap-1 text-sm">
            {brief.pontos_atencao.map((item) => (
              <li key={item} className="flex gap-2">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {brief.perguntas.length ? (
        <section className="flex flex-col gap-1">
          <SectionTitle>Perguntas a fazer</SectionTitle>
          {/* Caixas só para marcar durante a ligação; nada é gravado. `key` reinicia a cada briefing. */}
          <ol key={briefKey} className="flex flex-col gap-1.5 text-sm">
            {brief.perguntas.map((item, index) => (
              <li key={item}>
                <label className="flex cursor-pointer gap-2">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                    aria-label={`Pergunta ${index + 1} feita`}
                  />
                  <span>
                    <span className="tabular-nums text-muted-foreground">{index + 1}.</span> {item}
                  </span>
                </label>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {brief.objecoes_provaveis.length ? (
        <section className="flex flex-col gap-1">
          <SectionTitle>Objeções prováveis</SectionTitle>
          <div className="flex flex-col gap-1.5">
            {brief.objecoes_provaveis.map((item) => (
              <details
                key={item.objecao}
                className="rounded-lg border border-divider px-3 py-2 text-sm"
              >
                <summary className="cursor-pointer font-medium">{item.objecao}</summary>
                <p className="mt-1 text-muted-foreground">{item.resposta}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-1">
        <SectionTitle>Próximo passo sugerido</SectionTitle>
        <p className="text-sm">{brief.proximo_passo.acao}</p>
        <p className="crm-meta">Prazo sugerido: {DEADLINE_LABELS[brief.proximo_passo.prazo]}.</p>
      </section>

      {brief.lacunas.length ? (
        <section className="flex flex-col gap-1">
          <SectionTitle>O que falta saber</SectionTitle>
          <ul className="list-disc pl-5 text-sm">
            {brief.lacunas.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function BriefCard({ leadId, enabled, initial }: BriefCardProps) {
  const [brief, setBrief] = useState<Brief | null>(() => briefFromSnapshot(initial));
  const [generatedAt, setGeneratedAt] = useState<string | null>(initial?.createdAt ?? null);
  const [briefKey, setBriefKey] = useState(initial?.runId ?? "none");
  const [state, formAction, pending] = useActionState(
    async (prev: AiActionState<Brief>, formData: FormData) => {
      const result = await generateBriefAction(prev, formData);
      if (result.status === "ok") {
        setBrief(result.data);
        setGeneratedAt(new Date().toISOString());
        setBriefKey(result.runId);
      }
      return result;
    },
    initialAiActionState as AiActionState<Brief>,
  );
  const error = state.status === "error" ? state : null;
  // Teto diário atingido: só volta amanhã; o botão fica desabilitado até recarregar a página.
  const blocked = !enabled || error?.reason === "quota";

  return (
    <Card aria-busy={pending || undefined}>
      <CardHeader>
        <CardTitle>Preparar ligação</CardTitle>
        <CardDescription>
          Resumo, gancho de abertura, pontos de atenção, perguntas, objeções prováveis e próximo
          passo, a partir do histórico do CRM.
        </CardDescription>
        {brief && generatedAt ? (
          <p className="crm-meta">Gerado em {formatDateTime(generatedAt)} · modelo Claude</p>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <Callout tone="warning" role="alert">
            {error.message}
          </Callout>
        ) : null}
        {pending ? (
          <div className="flex flex-col gap-2">
            <span className="sr-only" role="status">
              Gerando o briefing…
            </span>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="mt-2 h-3 w-32" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : brief ? (
          <BriefBody brief={brief} briefKey={briefKey} />
        ) : null}
        <form action={formAction} className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <input type="hidden" name="leadId" value={leadId} />
          <Button
            type="submit"
            variant="outline"
            size={brief ? "sm" : "default"}
            disabled={pending || blocked}
          >
            {pending ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                Gerando…
              </>
            ) : (
              <>
                <Sparkles aria-hidden="true" />
                {brief ? "Gerar de novo" : "Gerar briefing"}
              </>
            )}
          </Button>
          {!enabled ? (
            <p className="crm-meta">IA não configurada.</p>
          ) : brief ? (
            <p className="crm-meta">{NOTE}</p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
