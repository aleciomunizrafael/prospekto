"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Lê um <input type="datetime-local"> ou "date" pelo id e mostra ao lado a data por extenso
// ("sex., 9 de out., 14:10"), atualizada a cada digitação (crm-design-system.md, seção 5.2).
// Só apresentação: o valor enviado pelo formulário não muda.
const WITH_TIME = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});
const DATE_ONLY = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

// O valor do campo já está no fuso do CRM; montamos a data em UTC e formatamos em UTC para
// mostrar exatamente o que foi digitado, sem depender do fuso do navegador.
export function describeInputDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value);
  if (!m) return "";
  const [, y, mo, d, h, min] = m;
  const date = new Date(Date.UTC(+y, +mo - 1, +d, h ? +h : 0, min ? +min : 0));
  if (Number.isNaN(date.getTime())) return "";
  return h ? WITH_TIME.format(date) : DATE_ONLY.format(date);
}

export function DateHint({
  inputId,
  initial,
  className,
}: {
  inputId: string;
  initial?: string;
  className?: string;
}) {
  const [text, setText] = useState(() => describeInputDate(initial ?? ""));
  useEffect(() => {
    const input = document.getElementById(inputId);
    if (!(input instanceof HTMLInputElement)) return;
    const update = () => setText(describeInputDate(input.value));
    update();
    input.addEventListener("input", update);
    input.addEventListener("change", update);
    return () => {
      input.removeEventListener("input", update);
      input.removeEventListener("change", update);
    };
  }, [inputId]);
  return (
    <span aria-live="polite" className={cn("crm-meta min-h-4", className)}>
      {text}
    </span>
  );
}
