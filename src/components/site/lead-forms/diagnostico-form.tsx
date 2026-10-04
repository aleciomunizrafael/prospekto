"use client";

import { useId, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  CheckboxField,
  ConsentFields,
  FieldShell,
  LeadForm,
  SelectField,
  SubmitButton,
  TextareaField,
  TextField,
  useLeadField,
  useLeadForm,
} from "@/components/site/form";
import {
  APURACAO_LABELS,
  APURACAO_OPTIONS,
  AVAILABILITY_LABELS,
  AVAILABILITY_OPTIONS,
  DECLARATION_MODEL_LABELS,
  DECLARATION_MODELS,
  DIAGNOSTIC_FORMAT_LABELS,
  DIAGNOSTIC_FORMATS,
  DIAGNOSTIC_ROLE_LABELS,
  DIAGNOSTIC_ROLES,
  IR_BAND_LABELS,
  IR_BANDS,
  IRPJ_BAND_LABELS,
  IRPJ_BANDS,
  TAX_REGIME_LABELS,
  TAX_REGIME_OPTIONS,
  type DiagnosticFormat,
} from "@/lib/validation/forms/diagnostico-options";
import { DIAGNOSTIC_PREFILL_KEY, type DiagnosticPrefill } from "@/components/simulator/view-model";
import { subscribeNoop } from "@/lib/analytics";
import { UFS } from "@/lib/domain/enums";

// Formulário de diagnóstico (estrutura-e-copy.md, seção 5.4; form_id diagnostic). `tipo_pessoa`
// alterna os campos PJ e PF; a query string pré-preenche só dados não pessoais (tipo, empresa,
// regime, faixa, projeto ou projeto_id, simulation_id, formato) vinda do simulador, de /empresas ou
// de um cartão de projeto. Nome, e-mail, telefone, cidade, UF, cargo e escritório contábil vindos do
// gate do simulador chegam por sessionStorage (DIAGNOSTIC_PREFILL_KEY), nunca pela URL. Tudo é
// lido no cliente depois da montagem (useSyncExternalStore, como a atribuição no LeadForm): a
// página continua estática e o formulário, com honeypot e campos ocultos, já vem no HTML. Depois
// de um erro, os valores enviados prevalecem sobre o pré-preenchimento.
type TaxpayerType = "PJ" | "PF";

type Prefill = {
  tipo: TaxpayerType | null;
  empresa: string;
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  cidade: string;
  uf: string;
  contador_escritorio: string;
  regime: string;
  faixa: string;
  projeto: string;
  simulationId: string;
  formato: DiagnosticFormat | null;
};

const options = <T extends readonly string[]>(values: T, labels: Record<T[number], string>) =>
  values.map((value) => ({ value, label: labels[value as T[number]] }));

const UF_OPTIONS = UFS.map((uf) => ({ value: uf, label: uf }));

function readStoredPrefill(json: string): DiagnosticPrefill {
  if (!json) return {};
  try {
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") out[key] = value;
    }
    return out as DiagnosticPrefill;
  } catch {
    return {};
  }
}

function readPrefill(params: URLSearchParams, stored: DiagnosticPrefill): Prefill {
  const tipoRaw = (params.get("tipo") ?? "").toUpperCase();
  const tipo: TaxpayerType | null = tipoRaw === "PJ" || tipoRaw === "PF" ? tipoRaw : null;
  const formatoRaw = params.get("formato") ?? "";
  const formato = (DIAGNOSTIC_FORMATS as readonly string[]).includes(formatoRaw)
    ? (formatoRaw as DiagnosticFormat)
    : null;
  return {
    tipo,
    empresa: params.get("empresa") || stored.empresa || "",
    nome: stored.nome ?? "",
    email: stored.email ?? "",
    telefone: stored.telefone ?? "",
    cargo: stored.cargo ?? "",
    cidade: stored.cidade ?? "",
    uf: stored.uf ?? "",
    contador_escritorio: stored.contador_escritorio ?? "",
    regime: params.get("regime") ?? "",
    faixa: params.get("faixa") ?? "",
    projeto: params.get("projeto") ?? params.get("projeto_id") ?? "",
    simulationId: params.get("simulation_id") ?? "",
    formato,
  };
}

const getSearch = () => window.location.search;
const getStored = () => {
  try {
    return window.sessionStorage.getItem(DIAGNOSTIC_PREFILL_KEY) ?? "";
  } catch {
    return "";
  }
};
const getServerSnapshot = () => "";

export function DiagnosticoForm({ titleId }: { titleId: string }) {
  const search = useSyncExternalStore(subscribeNoop, getSearch, getServerSnapshot);
  const stored = useSyncExternalStore(subscribeNoop, getStored, getServerSnapshot);
  const prefill = useMemo(
    () => readPrefill(new URLSearchParams(search), readStoredPrefill(stored)),
    [search, stored],
  );
  return (
    <LeadForm
      formId="diagnostic"
      ariaLabelledBy={titleId}
      fieldLabels={{
        tipo_pessoa: "Quem vai patrocinar",
        nome: "Nome",
        email: "E-mail",
        telefone: "Telefone ou WhatsApp",
        empresa: "Empresa",
        cnpj: "CNPJ",
        cargo: "Seu papel na empresa",
        regime_tributario: "Regime tributário",
        irpj_faixa: "IRPJ devido no ano",
        apuracao: "Apuração",
        contador_escritorio: "Escritório contábil",
        formato: "Formato da conversa",
        contador_participa: "Contador na reunião",
        modelo_declaracao: "Modelo da declaração",
        ir_devido_faixa: "Imposto devido na declaração",
        cidade: "Cidade",
        uf: "UF",
        disponibilidade: "Disponibilidade",
        mensagem: "Mensagem",
        projeto_id: "Projeto de interesse",
        consent_lgpd: "Autorização de contato",
      }}
    >
      <DiagnosticoFields prefill={prefill} />
    </LeadForm>
  );
}

function DiagnosticoFields({ prefill }: { prefill: Prefill }) {
  const { state } = useLeadForm();
  const sent = state.values ?? {};
  const value = (name: string, fallback = "") => sent[name] ?? fallback;

  // Escolha explícita da pessoa (null até clicar); antes disso vale o envio anterior, depois a
  // query string (que chega depois da montagem) e, por fim, o padrão. Sem efeitos nem setState.
  const sentType = sent.tipo_pessoa as TaxpayerType | undefined;
  const [chosenType, setChosenType] = useState<TaxpayerType | null>(null);
  const taxpayerType: TaxpayerType = chosenType ?? sentType ?? prefill.tipo ?? "PJ";
  const sentFormat = sent.formato as DiagnosticFormat | undefined;
  const [chosenFormat, setChosenFormat] = useState<DiagnosticFormat | null>(null);
  const format: DiagnosticFormat = chosenFormat ?? sentFormat ?? prefill.formato ?? "diagnostico";

  const projectRef = value("projeto_id", prefill.projeto);
  const projectError = useLeadField("projeto_id").error;

  return (
    <>
      <input type="hidden" name="projeto_id" value={projectRef} />
      <input
        type="hidden"
        name="simulation_id"
        value={value("simulation_id", prefill.simulationId)}
      />
      {projectRef ? (
        <p
          className="bg-sand rounded-lg px-4 py-3 text-[15px]"
          role={projectError ? "alert" : undefined}
        >
          {projectError ? (
            <span className="text-error font-medium">{projectError}</span>
          ) : (
            <>
              Pedido ligado ao projeto <strong>{projectRef}</strong>. A Daniela leva os dados dele
              para a conversa.
            </>
          )}
        </p>
      ) : null}

      <RadioChoice
        name="tipo_pessoa"
        label="Quem vai patrocinar"
        required
        value={taxpayerType}
        onChange={(v) => setChosenType(v as TaxpayerType)}
        options={[
          { value: "PJ", label: "Minha empresa (pessoa jurídica)" },
          { value: "PF", label: "Eu, pessoa física" },
        ]}
      />

      <TextField
        name="nome"
        label="Nome"
        autoComplete="name"
        required
        defaultValue={value("nome", prefill.nome)}
      />
      <TextField
        name="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={value("email", prefill.email)}
      />
      <TextField
        name="telefone"
        label="Telefone ou WhatsApp"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        required
        help="Com DDD. A reunião é marcada por WhatsApp ou ligação."
        defaultValue={value("telefone", prefill.telefone)}
      />

      {taxpayerType === "PJ" ? (
        <fieldset className="border-border flex flex-col gap-5 rounded-lg border p-4">
          <legend className="site-label px-1">Sobre a empresa</legend>
          <TextField
            name="empresa"
            label="Empresa"
            autoComplete="organization"
            required
            defaultValue={value("empresa", prefill.empresa)}
          />
          <TextField
            name="cnpj"
            label="CNPJ"
            inputMode="numeric"
            help="Opcional. Ajuda a confirmar o regime antes da conversa."
          />
          <SelectField
            name="cargo"
            label="Seu papel na empresa"
            required
            options={options(DIAGNOSTIC_ROLES, DIAGNOSTIC_ROLE_LABELS)}
            defaultValue={value(
              "cargo",
              (DIAGNOSTIC_ROLES as readonly string[]).includes(prefill.cargo) ? prefill.cargo : "",
            )}
          />
          <SelectField
            name="regime_tributario"
            label="Regime tributário"
            required
            options={options(TAX_REGIME_OPTIONS, TAX_REGIME_LABELS)}
            defaultValue={value("regime_tributario", prefill.regime)}
            help="A Lei Rouanet exige lucro real. No presumido ou no Simples, avaliamos a LIC-RS (ICMS)."
          />
          <SelectField
            name="irpj_faixa"
            label="IRPJ devido no ano"
            required
            options={options(IRPJ_BANDS, IRPJ_BAND_LABELS)}
            defaultValue={value("irpj_faixa", prefill.faixa)}
            help="Imposto à alíquota de 15%, sem o adicional de 10%. Uma estimativa basta."
          />
          <SelectField
            name="apuracao"
            label="Apuração"
            options={options(APURACAO_OPTIONS, APURACAO_LABELS)}
            placeholder="Opcional"
          />
          <TextField
            name="contador_escritorio"
            label="Escritório contábil"
            help="Opcional. O escritório que apura o imposto da empresa."
            defaultValue={value("contador_escritorio", prefill.contador_escritorio)}
          />
          <RadioChoice
            name="formato"
            label="Formato da conversa"
            required
            value={format}
            onChange={(v) => setChosenFormat(v as DiagnosticFormat)}
            options={options(DIAGNOSTIC_FORMATS, DIAGNOSTIC_FORMAT_LABELS)}
            help="Ainda não quer envolver o contador? Comece pela simulação de 20 minutos: a Daniela leva a conta e dois ou três projetos."
          />
          <CheckboxField
            name="contador_participa"
            label="O contador da empresa participa da reunião"
            required={format === "diagnostico"}
            help={
              format === "diagnostico"
                ? "O diagnóstico é com o contador presente: ele confirma o limite com quem apura o imposto."
                : "Na simulação o contador não precisa participar. Marque se preferir que ele já venha."
            }
          />
        </fieldset>
      ) : (
        <fieldset className="border-border flex flex-col gap-5 rounded-lg border p-4">
          <legend className="site-label px-1">Sobre a sua declaração</legend>
          <SelectField
            name="modelo_declaracao"
            label="Modelo da declaração"
            required
            options={options(DECLARATION_MODELS, DECLARATION_MODEL_LABELS)}
            help="Só o modelo completo permite deduzir incentivos."
          />
          <SelectField
            name="ir_devido_faixa"
            label="Imposto devido na declaração"
            required
            options={options(IR_BANDS, IR_BAND_LABELS)}
            defaultValue={value("ir_devido_faixa", prefill.faixa)}
            help="Imposto devido apurado na declaração do ano passado serve de referência."
          />
        </fieldset>
      )}

      <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
        <TextField
          name="cidade"
          label="Cidade"
          autoComplete="address-level2"
          required
          defaultValue={value("cidade", prefill.cidade)}
        />
        <SelectField
          name="uf"
          label="UF"
          required
          options={UF_OPTIONS}
          placeholder="UF"
          defaultValue={value("uf", prefill.uf)}
        />
      </div>
      <SelectField
        name="disponibilidade"
        label="Disponibilidade"
        options={options(AVAILABILITY_OPTIONS, AVAILABILITY_LABELS)}
        placeholder="Opcional"
        help="Melhor período para a Daniela ligar ou marcar."
      />
      <TextareaField
        name="mensagem"
        label="Mensagem"
        help="Opcional. Até 2.000 caracteres."
        maxLength={2000}
      />
      <ConsentFields />
      <SubmitButton>Pedir meu diagnóstico</SubmitButton>
    </>
  );
}

// Grupo de opções controlado (o formulário precisa reagir à escolha); mesma marcação acessível do
// RadioGroupField, com fieldset, legend, aria-describedby e erro do campo.
function RadioChoice({
  name,
  label,
  help,
  required,
  options,
  value,
  onChange,
}: {
  name: string;
  label: string;
  help?: ReactNode;
  required?: boolean;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { error } = useLeadField(name);
  const base = useId();
  const helpId = help ? `${base}-ajuda` : undefined;
  const errorId = error ? `${base}-erro` : undefined;
  return (
    <FieldShell
      name={name}
      label={label}
      required={required}
      help={help}
      error={error}
      as="fieldset"
    >
      <div
        role="radiogroup"
        aria-describedby={[helpId, errorId].filter(Boolean).join(" ") || undefined}
        aria-invalid={error ? true : undefined}
        className="flex flex-col gap-2"
      >
        {options.map((o) => {
          const id = `${base}-${o.value}`;
          return (
            <label key={o.value} htmlFor={id} className="touch-target flex items-center gap-3">
              <input
                id={id}
                type="radio"
                name={name}
                value={o.value}
                checked={value === o.value}
                onChange={() => onChange(o.value)}
                required={required}
                className="accent-primary size-5"
              />
              <span>{o.label}</span>
            </label>
          );
        })}
      </div>
    </FieldShell>
  );
}
