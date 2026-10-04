"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import { createLeadFromForm, issueFormToken } from "@/actions/leads";
import { getAttributionSnapshot, getEmptyAttribution, subscribeNoop, track } from "@/lib/analytics";
import type { FormId } from "@/lib/validation/forms";
import { initialLeadFormState, type LeadFormState } from "@/lib/validation/forms/state";
import { cn } from "@/lib/utils";
import { ErrorSummary } from "./error-summary";

// Formulário público de captura de lead (estrutura-e-copy.md, seções 5.1 e 9.2) sobre a Server
// Action createLeadFromForm. Fornece aos campos filhos (TextField, SelectField, ConsentFields...)
// o estado devolvido pela action (erros por campo e valores enviados) via contexto.
//
// Campos ocultos que toda submissão leva (convenção documentada em src/actions/README.md):
//   form_id, utm_source, utm_medium, utm_campaign, referrer, landing_path, source_page,
//   form_ts (carimbo de tempo assinado) e website (honeypot; precisa continuar vazio).
type LeadFormContextValue = {
  // FormId nos formulários registrados em FORMS; o gate do simulador (src/components/simulator)
  // usa a sua própria Server Action e passa o id do formulário como texto.
  formId: FormId | string;
  state: LeadFormState;
  pending: boolean;
};

const LeadFormContext = createContext<LeadFormContextValue | null>(null);

// Fornece aos campos (TextField, SelectField, ConsentFields, SubmitButton...) o estado de um
// formulário que não usa createLeadFromForm (o gate do simulador), com os mesmos erros por campo.
export function LeadFormProvider({
  children,
  ...value
}: LeadFormContextValue & { children: ReactNode }) {
  return <LeadFormContext.Provider value={value}>{children}</LeadFormContext.Provider>;
}

export function useLeadForm(): LeadFormContextValue {
  const ctx = useContext(LeadFormContext);
  if (!ctx) throw new Error("useLeadForm só pode ser usado dentro de <LeadForm>.");
  return ctx;
}

// Erro e valor enviado de um campo, pelo atributo `name`.
export function useLeadField(name: string): { error?: string; value?: string } {
  const { state } = useLeadForm();
  return { error: state.fieldErrors?.[name], value: state.values?.[name] };
}

type Props = {
  formId: FormId;
  children: ReactNode;
  // Rótulos dos campos, para o resumo de erros ("Nome: Informe seu nome.").
  fieldLabels?: Record<string, string>;
  // id do título acessível do formulário (aria-labelledby) ou rótulo direto.
  ariaLabelledBy?: string;
  ariaLabel?: string;
  className?: string;
};

export function LeadForm({
  formId,
  children,
  fieldLabels,
  ariaLabelledBy,
  ariaLabel,
  className,
}: Props) {
  const [state, formAction, pending] = useActionState(createLeadFromForm, initialLeadFormState);
  const [token, setToken] = useState("");
  const started = useRef(false);
  // Atribuição (UTM, referrer, página de entrada) lida no cliente, sem efeito: as páginas são
  // estáticas e o snapshot do servidor é vazio, então não há divergência de hidratação.
  const attribution = useSyncExternalStore(
    subscribeNoop,
    getAttributionSnapshot,
    getEmptyAttribution,
  );
  const sourcePage = usePathname();

  // Carimbo de tempo assinado ao montar e de novo quando a action o recusar (expirado após 24 h).
  const needsToken = state.status === "error" && state.errorCode === "token";
  useEffect(() => {
    let cancelled = false;
    issueFormToken()
      .then((t) => {
        if (!cancelled) setToken(t);
      })
      .catch(() => {
        // Sem token o envio devolve a mensagem de "recarregue a página".
      });
    return () => {
      cancelled = true;
    };
  }, [needsToken]);

  // form_error quando a action devolve erro (uma vez por resposta).
  useEffect(() => {
    if (state.status !== "error") return;
    const field = state.fieldErrors ? Object.keys(state.fieldErrors)[0] : undefined;
    track("form_error", {
      form_id: formId,
      field: field ?? null,
      error_code: state.errorCode ?? null,
    });
  }, [state, formId]);

  function onFocusCapture() {
    if (started.current) return;
    started.current = true;
    track("form_start", { form_id: formId });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const marketing = event.currentTarget.elements.namedItem("consent_marketing");
    const checked = marketing instanceof HTMLInputElement ? marketing.checked : false;
    track("consent_marketing", { form_id: formId, value: checked });
  }

  return (
    <LeadFormContext.Provider value={{ formId, state, pending }}>
      <form
        action={formAction}
        onSubmit={onSubmit}
        onFocusCapture={onFocusCapture}
        noValidate
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabel}
        className={cn("flex flex-col gap-5", className)}
      >
        <ErrorSummary state={state} fieldLabels={fieldLabels} />
        <input type="hidden" name="form_id" value={formId} />
        <input type="hidden" name="utm_source" value={attribution.utm_source} />
        <input type="hidden" name="utm_medium" value={attribution.utm_medium} />
        <input type="hidden" name="utm_campaign" value={attribution.utm_campaign} />
        <input type="hidden" name="referrer" value={attribution.referrer} />
        <input type="hidden" name="landing_path" value={attribution.landing_path} />
        <input type="hidden" name="source_page" value={sourcePage ?? ""} />
        <input type="hidden" name="form_ts" value={token} />
        {/* Honeypot (R-18): invisível e fora da ordem de tabulação; humanos não preenchem. */}
        <div className="honeypot" aria-hidden="true">
          <label htmlFor={`${formId}-website`}>Não preencha este campo</label>
          <input
            id={`${formId}-website`}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
          />
        </div>
        {children}
      </form>
    </LeadFormContext.Provider>
  );
}
