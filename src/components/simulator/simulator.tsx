"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { SectionHeader } from "@/components/site/section-header";
import { site } from "@/config/site";
import { subscribeNoop, track } from "@/lib/analytics";
import {
  params,
  simulate,
  type SimulatorInput,
  type SimulatorResult,
  type TaxpayerType,
} from "@/lib/simulator";
import { SimulatorDetail } from "./detail";
import { taxpayerTypeFromQuery } from "./view-model";
import { PfForm } from "./pf-form";
import { PjForm } from "./pj-form";
import type { SimulatorGateState } from "./state";
import { TaxpayerStep } from "./step-taxpayer";
import { SimulatorSummary } from "./summary";

// Raiz do simulador (simulador-spec.md, seção 10): telas 1 a 3 no cliente (o cálculo é puro e roda
// no navegador) e tela 4 após o gate. Progresso em texto ("Passo 1 de 3"). Eventos de analytics
// simulator_start e simulator_step (estrutura-e-copy.md, 9.2); só tipos e faixas. Com
// /simulador?tipo=PF (ou PJ), a tela 1 é pulada depois da montagem (a página continua estática).
type Props = {
  // Cookie assinado do gate presente: o detalhe abre direto (spec, seção 6).
  gatePassed: boolean;
};

type Screen =
  | { step: 1 }
  | { step: 2; type: TaxpayerType }
  | { step: 3; input: SimulatorInput; result: SimulatorResult }
  | { step: 4; state: Extract<SimulatorGateState, { status: "success" }> };

const STEP_TITLES: Record<1 | 2 | 3, { pj: string; pf: string }> = {
  1: {
    pj: "Quanto do seu imposto pode virar cultura?",
    pf: "Quanto do seu imposto pode virar cultura?",
  },
  2: { pj: "Dados da empresa", pf: "Dados da declaração" },
  3: { pj: "Resultado resumido", pf: "Resultado resumido" },
};

const getSearch = () => window.location.search;
const getServerSearch = () => "";

export function Simulator({ gatePassed }: Props) {
  // Tipo escolhido na página de origem (/pessoa-fisica -> /simulador?tipo=PF): a query é lida no
  // cliente depois da montagem (snapshot vazio no servidor) e vale enquanto ninguém mudou de tela.
  const search = useSyncExternalStore(subscribeNoop, getSearch, getServerSearch);
  const queryType = useMemo(() => taxpayerTypeFromQuery(search), [search]);
  const [chosen, setScreen] = useState<Screen | null>(null);
  const screen: Screen = chosen ?? (queryType ? { step: 2, type: queryType } : { step: 1 });
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chosen) return;
    top.current?.scrollIntoView({ block: "start" });
    top.current?.focus();
  }, [chosen]);

  useEffect(() => {
    if (!queryType) return;
    track("simulator_start", { taxpayer_type: queryType });
    track("simulator_step", { taxpayer_type: queryType, step: 2 });
  }, [queryType]);

  const onSelect = useCallback((type: TaxpayerType) => {
    track("simulator_start", { taxpayer_type: type });
    track("simulator_step", { taxpayer_type: type, step: 2 });
    setScreen({ step: 2, type });
  }, []);

  const onCalculate = useCallback((input: SimulatorInput) => {
    const result = simulate(input);
    track("simulator_step", { taxpayer_type: input.taxpayer_type, step: 3 });
    setScreen({ step: 3, input, result });
  }, []);

  const onDetail = useCallback((state: Extract<SimulatorGateState, { status: "success" }>) => {
    track("simulator_step", { taxpayer_type: state.detail.input.taxpayer_type, step: 4 });
    setScreen({ step: 4, state });
  }, []);

  const restart = useCallback(() => setScreen({ step: 1 }), []);

  if (screen.step === 4) {
    return (
      <div ref={top} tabIndex={-1} className="outline-none">
        <SimulatorDetail
          data={screen.state.detail}
          outcome={screen.state.outcome}
          emailTo={screen.state.emailTo}
          onRestart={restart}
        />
      </div>
    );
  }

  const type: TaxpayerType =
    screen.step === 1 ? "pj" : screen.step === 2 ? screen.type : screen.input.taxpayer_type;

  return (
    <div ref={top} tabIndex={-1} className="flex flex-col gap-10 outline-none">
      <SectionHeader
        as="h1"
        label="Simulador de incentivo fiscal"
        title={STEP_TITLES[screen.step][type]}
        subtitle={<p aria-live="polite">Passo {screen.step} de 3</p>}
      />
      {screen.step === 1 ? (
        <TaxpayerStep parametersVersion={params.atualizado_em} onSelect={onSelect} />
      ) : null}
      {screen.step === 2 && screen.type === "pj" ? (
        <PjForm onCalculate={onCalculate} onBack={restart} />
      ) : null}
      {screen.step === 2 && screen.type === "pf" ? (
        <PfForm onCalculate={onCalculate} onBack={restart} />
      ) : null}
      {screen.step === 3 ? (
        <SimulatorSummary
          input={screen.input}
          result={screen.result}
          gatePassed={gatePassed}
          onDetail={onDetail}
          onBack={() => setScreen({ step: 2, type: screen.input.taxpayer_type })}
        />
      ) : null}
      {screen.step !== 3 ? (
        <p id="nota-tecnica" className="text-muted-foreground text-[14px]">
          {site.disclaimer}
        </p>
      ) : null}
    </div>
  );
}
