"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { track } from "@/lib/analytics";

// Dispara form_submit na página de obrigado (seção 9.2: "envio aceito"). A Server Action redireciona
// com `f` (form_id), `s` (segmento) e `o` (origem); nenhum dado pessoal. Precisa de <Suspense> na
// página, porque useSearchParams suspende em páginas estáticas.
export function ThanksTracker() {
  const params = useSearchParams();
  const formId = params.get("f");
  const segment = params.get("s");
  const origin = params.get("o");
  useEffect(() => {
    if (!formId) return;
    track("form_submit", { form_id: formId, segment, origin });
  }, [formId, segment, origin]);
  return null;
}
