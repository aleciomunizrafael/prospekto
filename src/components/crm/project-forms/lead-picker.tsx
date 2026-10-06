"use client";
// Busca de leads por nome ou e-mail dentro de um formulário: chama uma Server Action de busca e
// grava o id escolhido num campo oculto `leadId`. Sem autocomplete sofisticado: um campo, um botão
// "Buscar" e uma lista de cards de 44 px com rádio; segmento e estágio em português.
import { Search } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { SEGMENT_LABELS, stageLabel } from "@/lib/crm/labels";
import { cn } from "@/lib/utils";
import { controlClass, useFieldError } from "./action-form";

export type LeadPick = {
  id: string;
  name: string;
  email: string;
  segment: string;
  stage: string;
  orgName?: string | null;
  orgId?: string | null;
};

type LeadPickerProps = {
  search: (query: string) => Promise<LeadPick[]>;
  label?: string;
  help?: string;
  onPick?: (lead: LeadPick) => void;
  required?: boolean;
};

function segmentLabel(segment: string): string {
  return (SEGMENT_LABELS as Record<string, string>)[segment] ?? segment;
}

// A Server Action de aporte devolve "Escolha um lead PJ ou PF." para o campo; aqui a frase vira a
// instrução de uso do campo (só apresentação; a action não muda).
function humanError(error: string | undefined): string | undefined {
  if (!error) return undefined;
  return /^Escolha um lead/i.test(error) ? "Busque e escolha o patrocinador na lista." : error;
}

export function LeadPicker({
  search,
  label = "Patrocinador (lead)",
  help = "Busque pelo nome ou e-mail e escolha na lista.",
  onPick,
  required = true,
}: LeadPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LeadPick[] | null>(null);
  const [picked, setPicked] = useState<LeadPick | null>(null);
  const [pending, startTransition] = useTransition();
  const error = humanError(useFieldError("leadId"));
  const id = useId();

  function runSearch() {
    startTransition(async () => {
      const rows = await search(query);
      setResults(rows);
    });
  }

  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby={`${id}-ajuda`}>
      <legend className="text-sm font-medium">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            {" "}
            *
          </span>
        ) : null}
      </legend>
      <p id={`${id}-ajuda`} className="text-muted-foreground text-sm">
        {help}
      </p>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              }
            }}
            placeholder="Nome ou e-mail"
            className={cn(controlClass, "pl-9")}
            aria-label="Buscar lead por nome ou e-mail"
            aria-required={required || undefined}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="touch"
          className="md:h-9"
          onClick={runSearch}
          disabled={pending}
        >
          {pending ? "Buscando..." : "Buscar"}
        </Button>
      </div>
      <input type="hidden" name="leadId" value={picked?.id ?? ""} />
      {results && results.length === 0 ? (
        <p className="text-muted-foreground text-sm" role="status">
          Nenhum lead encontrado com esse nome ou e-mail.
        </p>
      ) : null}
      {results && results.length > 0 ? (
        <ul className="flex flex-col gap-2" aria-label="Leads encontrados">
          {results.map((lead) => (
            <li key={lead.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors duration-120 hover:bg-surface-2 has-[:checked]:border-primary/40 has-[:checked]:bg-primary-soft">
                <input
                  type="radio"
                  name="leadPick"
                  value={lead.id}
                  checked={picked?.id === lead.id}
                  onChange={() => {
                    setPicked(lead);
                    onPick?.(lead);
                  }}
                  className="accent-primary size-4 shrink-0"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{lead.name}</span>
                  <span className="crm-meta truncate">
                    {segmentLabel(lead.segment)} · {stageLabel(lead.stage)} · {lead.email}
                    {lead.orgName ? ` · ${lead.orgName}` : ""}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
      {picked ? (
        <p className="text-sm" role="status">
          Escolhido: <span className="font-medium">{picked.name}</span>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-destructive text-sm font-medium">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
