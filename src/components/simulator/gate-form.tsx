"use client";

import { usePathname } from "next/navigation";
import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { issueFormToken } from "@/actions/leads";
import { submitSimulatorLead } from "@/actions/simulator";
import {
  ConsentFields,
  ErrorSummary,
  LeadFormProvider,
  SelectField,
  SubmitButton,
  TextField,
} from "@/components/site/form";
import { getAttributionSnapshot, getEmptyAttribution, subscribeNoop, track } from "@/lib/analytics";
import { UFS } from "@/lib/domain/enums";
import type { SimulatorInput, SimulatorResult } from "@/lib/simulator";
import {
  CARGO_OPTIONS,
  SIMULATOR_FORM_IDS,
  SIMULATOR_GATE_LABELS,
} from "@/lib/validation/forms/simulator-options";
import type { LeadFormState } from "@/lib/validation/forms/state";
import { initialSimulatorGateState, type SimulatorGateState } from "./state";
import { resultBand } from "./view-model";

// Gate do simulador (simulador-spec.md, seção 6): campos por tipo, consentimentos, honeypot, carimbo
// assinado e campos ocultos de atribuição, iguais ao LeadForm; a Server Action é
// submitSimulatorLead, que devolve o detalhe sem redirecionar. Os campos reaproveitam os primitivos
// do site pelo LeadFormProvider.
type Props = {
  input: SimulatorInput;
  result: SimulatorResult;
  onSuccess: (state: Extract<SimulatorGateState, { status: "success" }>) => void;
};

const UF_OPTIONS = UFS.map((uf) => ({ value: uf, label: uf }));

export function SimulatorGateForm({ input, result, onSuccess }: Props) {
  const formId = SIMULATOR_FORM_IDS[input.taxpayer_type];
  const [state, formAction, pending] = useActionState(
    submitSimulatorLead,
    initialSimulatorGateState,
  );
  const [token, setToken] = useState("");
  const started = useRef(false);
  const delivered = useRef<SimulatorGateState | null>(null);
  const attribution = useSyncExternalStore(
    subscribeNoop,
    getAttributionSnapshot,
    getEmptyAttribution,
  );
  const sourcePage = usePathname();

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

  useEffect(() => {
    if (delivered.current === state) return;
    delivered.current = state;
    if (state.status === "error") {
      const field = state.fieldErrors ? Object.keys(state.fieldErrors)[0] : undefined;
      track("form_error", { form_id: formId, field: field ?? null, error_code: state.errorCode });
    }
    if (state.status === "success") onSuccess(state);
  }, [state, formId, onSuccess]);

  function onFocusCapture() {
    if (started.current) return;
    started.current = true;
    track("form_start", { form_id: formId });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const marketing = event.currentTarget.elements.namedItem("consent_marketing");
    const checked = marketing instanceof HTMLInputElement ? marketing.checked : false;
    track("consent_marketing", { form_id: formId, value: checked });
    track("simulator_gate_submit", {
      taxpayer_type: input.taxpayer_type,
      tax_band: resultBand(input, result),
    });
  }

  const leadState: LeadFormState =
    state.status === "error"
      ? {
          status: "error",
          errorCode: state.errorCode,
          message: state.message,
          fieldErrors: state.fieldErrors,
          values: state.values,
        }
      : { status: "idle" };

  return (
    <LeadFormProvider formId={formId} state={leadState} pending={pending}>
      <form
        action={formAction}
        onSubmit={onSubmit}
        onFocusCapture={onFocusCapture}
        noValidate
        aria-labelledby="gate-titulo"
        className="flex flex-col gap-5"
      >
        <ErrorSummary state={leadState} fieldLabels={SIMULATOR_GATE_LABELS} />
        <input type="hidden" name="form_id" value={formId} />
        <input type="hidden" name="simulator_input" value={JSON.stringify(input)} />
        <input type="hidden" name="utm_source" value={attribution.utm_source} />
        <input type="hidden" name="utm_medium" value={attribution.utm_medium} />
        <input type="hidden" name="utm_campaign" value={attribution.utm_campaign} />
        <input type="hidden" name="referrer" value={attribution.referrer} />
        <input type="hidden" name="landing_path" value={attribution.landing_path} />
        <input type="hidden" name="source_page" value={sourcePage ?? "/simulador"} />
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

        <TextField name="nome" label="Nome" required autoComplete="name" />
        <TextField name="email" label="E-mail" required type="email" autoComplete="email" />
        {input.taxpayer_type === "pj" ? (
          <>
            <TextField name="empresa" label="Empresa" required autoComplete="organization" />
            <SelectField
              name="cargo"
              label="Seu papel na empresa"
              required
              options={[...CARGO_OPTIONS]}
            />
          </>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
          <TextField name="cidade" label="Cidade" required autoComplete="address-level2" />
          <SelectField name="uf" label="UF" required options={UF_OPTIONS} placeholder="UF" />
        </div>
        <TextField
          name="telefone"
          label="Telefone ou WhatsApp"
          type="tel"
          autoComplete="tel"
          help="Com DDD. Habilita o contato por WhatsApp."
        />
        <TextField
          name="contador_escritorio"
          label={
            input.taxpayer_type === "pj"
              ? "Escritório contábil da empresa"
              : "Quem faz a sua declaração"
          }
          autoComplete="off"
          help="Ajuda a preparar o diagnóstico com o contador."
        />
        <ConsentFields />
        <SubmitButton pendingLabel="Preparando o resultado...">
          Ver resultado detalhado
        </SubmitButton>
      </form>
    </LeadFormProvider>
  );
}
