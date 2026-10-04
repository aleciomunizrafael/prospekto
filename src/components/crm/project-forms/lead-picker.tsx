"use client";
// Busca de leads por nome ou e-mail dentro de um formulário: chama uma Server Action de busca e
// grava o id escolhido num campo oculto `leadId`. Sem autocomplete sofisticado: um campo, um botão
// "Buscar" e uma lista de opções com rádio.
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
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
};

export function LeadPicker({
  search,
  label = "Patrocinador (lead)",
  help = "Busque pelo nome ou e-mail e escolha na lista.",
  onPick,
}: LeadPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LeadPick[] | null>(null);
  const [picked, setPicked] = useState<LeadPick | null>(null);
  const [pending, startTransition] = useTransition();
  const error = useFieldError("leadId");

  function runSearch() {
    startTransition(async () => {
      const rows = await search(query);
      setResults(rows);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">
        {label}
        <span className="text-muted-foreground font-normal"> (obrigatório)</span>
      </span>
      <p className="text-muted-foreground text-sm">{help}</p>
      <div className="flex gap-2">
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
          className={controlClass}
          aria-label="Buscar lead por nome ou e-mail"
        />
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          onClick={runSearch}
          disabled={pending}
        >
          {pending ? "Buscando..." : "Buscar"}
        </Button>
      </div>
      <input type="hidden" name="leadId" value={picked?.id ?? ""} />
      {results && results.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nenhum lead encontrado com esse nome ou e-mail.
        </p>
      ) : null}
      {results && results.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {results.map((lead) => (
            <li key={lead.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
                <input
                  type="radio"
                  name="leadPick"
                  value={lead.id}
                  checked={picked?.id === lead.id}
                  onChange={() => {
                    setPicked(lead);
                    onPick?.(lead);
                  }}
                  className="size-4"
                />
                <span>
                  <span className="font-medium">{lead.name}</span>{" "}
                  <span className="text-muted-foreground">
                    ({lead.segment}, {lead.stage}) {lead.email}
                    {lead.orgName ? ` · ${lead.orgName}` : ""}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      ) : null}
      {picked ? (
        <p className="text-sm">
          Escolhido: <span className="font-medium">{picked.name}</span>
        </p>
      ) : null}
      {error ? <p className="text-destructive text-sm font-medium">{error}</p> : null}
    </div>
  );
}
