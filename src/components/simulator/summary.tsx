"use client";

import { useEffect, useRef, useState } from "react";
import { recordReturningSimulation } from "@/actions/simulator";
import { siteButtonClass } from "@/components/analytics/track-link";
import { site } from "@/config/site";
import { currentPath, track } from "@/lib/analytics";
import { formatBRL, renderText, type SimulatorInput, type SimulatorResult } from "@/lib/simulator";
import { SimulatorGateForm } from "./gate-form";
import { Notice } from "./notice";
import type { SimulatorGateState } from "./state";
import {
  disqualifiedReason,
  exampleLabel,
  headline,
  noticeKeys,
  summaryAnalyticsProps,
  summaryScreen,
  warningText,
  whatsappHref,
  whatsappMessage,
} from "./view-model";

// Tela 3 (simulador-spec.md, seções 5.1, 8 e 10): número grande da cesta cultural (LC 224 por
// padrão, valor sem redução logo abaixo), duas linhas de contexto, estados disqualified, no_tax e
// band_only, avisos unknown_regime/unknown_model, e o gate de captura abaixo, sem esconder o número.
type Props = {
  input: SimulatorInput;
  result: SimulatorResult;
  gatePassed: boolean;
  onDetail: (state: Extract<SimulatorGateState, { status: "success" }>) => void;
  onBack: () => void;
};

const DETAIL_ITEMS = [
  "Tabela por mecanismo, com teto, dedução por real aportado e custo líquido",
  "Comparação pagar imposto contra patrocinar, com o aporte editável",
  "Cenários com e sem a redução da LC 224/2025 (empresas)",
  "Prazos e próximos passos, com link para o resultado válido por 30 dias",
];

export function SimulatorSummary({ input, result, gatePassed, onDetail, onBack }: Props) {
  const [showGate, setShowGate] = useState(false);
  const [returning, setReturning] = useState<"idle" | "pending" | "failed">("idle");
  const [canSkipGate, setCanSkipGate] = useState(gatePassed);
  const gateRef = useRef<HTMLDivElement>(null);
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    track("simulator_summary_view", summaryAnalyticsProps(input, result));
    const reason = disqualifiedReason(input, result);
    if (reason) track("simulator_disqualified", { taxpayer_type: input.taxpayer_type, reason });
  }, [input, result]);

  useEffect(() => {
    if (showGate) gateRef.current?.focus();
  }, [showGate]);

  async function openDetail() {
    if (!canSkipGate) {
      setShowGate(true);
      return;
    }
    setReturning("pending");
    try {
      const state = await recordReturningSimulation(JSON.stringify(input), currentPath());
      if (state.status === "success") {
        onDetail(state);
        return;
      }
    } catch {
      // Sem rede ou cookie inválido: cai no gate.
    }
    setReturning("failed");
    setCanSkipGate(false);
    setShowGate(true);
  }

  const screen = summaryScreen(result);
  const head = headline(result);
  const notices = noticeKeys(result);
  const message = whatsappMessage(input, result);

  return (
    <div className="flex flex-col gap-10">
      {notices.length ? (
        <div className="flex flex-col gap-3">
          {notices.map((key) => (
            <Notice key={key} kind="warning">
              <p>{warningText(result, key)}</p>
            </Notice>
          ))}
        </div>
      ) : null}

      {screen === "disqualified" ? (
        <Notice
          kind="warning"
          title={input.taxpayer_type === "pj" ? "Regime fora do lucro real" : "Modelo simplificado"}
        >
          {result.disqualified?.reason === "regime" ? (
            <>
              <p>{renderText("disqualified_regime")}</p>
              {result.lic_rs ? <p>{renderText("disqualified_regime_lic_rs")}</p> : null}
            </>
          ) : (
            <p>{renderText("disqualified_model")}</p>
          )}
        </Notice>
      ) : null}

      {screen === "no_tax" ? (
        <Notice kind="warning" title="Sem imposto devido">
          <p>{renderText("no_tax")}</p>
        </Notice>
      ) : null}

      {screen === "examples" && result.examples ? (
        <div className="flex flex-col gap-4">
          <p className="site-prose">{renderText("band_examples")}</p>
          <ExamplesTable rows={result.examples} />
        </div>
      ) : null}

      {head ? (
        <div className="flex flex-col gap-3">
          <p className="site-number">{head.value}</p>
          <p className="max-w-[40ch] text-lg leading-snug">{head.caption}</p>
          {head.secondary ? (
            <p className="text-muted-foreground tabular">{head.secondary}</p>
          ) : null}
          <ul className="site-prose mt-2 flex list-disc flex-col gap-2 pl-5">
            {head.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {result.lic_rs?.status === "ok" ? (
            <p className="site-prose">
              Pela LIC-RS (ICMS), o limite anual da empresa é de{" "}
              <strong className="tabular">{formatBRL(result.lic_rs.annual_limit)}</strong>; o
              detalhe mostra o repasse ao FAC e o desembolso total.
            </p>
          ) : null}
        </div>
      ) : result.lic_rs ? (
        <div className="flex flex-col gap-3">
          {result.lic_rs.status === "ok" ? (
            <>
              <p className="site-number">Até {formatBRL(result.lic_rs.annual_limit)}</p>
              <p className="max-w-[40ch] text-lg leading-snug">
                do ICMS da sua empresa podem ir para projetos culturais pela LIC-RS, com repasse de{" "}
                {formatBRL(result.lic_rs.fac_transfer)} ao FAC como custo não incentivado.
              </p>
            </>
          ) : (
            <p className="site-prose">{renderText("no_icms")}</p>
          )}
        </div>
      ) : null}

      <p className="text-muted-foreground text-[14px]">{site.disclaimer}</p>

      <section
        aria-labelledby="gate-titulo"
        className="border-border bg-sand flex flex-col gap-6 rounded-lg border p-5 md:p-8"
      >
        <div className="flex flex-col gap-3">
          <h2 id="gate-titulo" className="site-h3">
            {screen === "disqualified"
              ? "Quero saber de outras formas de apoiar"
              : "Ver resultado detalhado"}
          </h2>
          <ul className="site-prose flex list-disc flex-col gap-1 pl-5">
            {DETAIL_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        {returning === "failed" ? (
          <Notice kind="warning">
            <p>Seu acesso anterior expirou. Preencha o formulário para ver o detalhe.</p>
          </Notice>
        ) : null}
        {showGate ? (
          <div ref={gateRef} tabIndex={-1} className="bg-background rounded-lg p-4 md:p-6">
            <SimulatorGateForm input={input} result={result} onSuccess={onDetail} />
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={openDetail}
              disabled={returning === "pending"}
              aria-disabled={returning === "pending" || undefined}
              className={siteButtonClass("primary")}
            >
              {returning === "pending" ? "Preparando o resultado..." : "Ver resultado detalhado"}
            </button>
          </div>
        )}
        <p>
          <a
            href={whatsappHref(message)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-4"
            onClick={() => track("whatsapp_click", { context: "page", path: currentPath() })}
          >
            Prefiro falar agora no WhatsApp
          </a>
        </p>
      </section>

      <div>
        <button type="button" onClick={onBack} className={siteButtonClass("link")}>
          Refazer a simulação
        </button>
      </div>
    </div>
  );
}

// Tabela de exemplos de P.exemplos (faixa nao_sei): cartões no celular, tabela no desktop.
export function ExamplesTable({ rows }: { rows: Array<Record<string, number>> }) {
  const keys = Object.keys(rows[0] ?? {});
  return (
    <>
      <div className="flex flex-col gap-3 md:hidden">
        {rows.map((row, index) => (
          <dl
            key={index}
            className="border-border grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-lg border p-4 text-[15px]"
          >
            {keys.map((key) => (
              <div key={key} className="contents">
                <dt className="text-muted-foreground">{exampleLabel(key)}</dt>
                <dd className="tabular text-right font-medium">{formatBRL(row[key])}</dd>
              </div>
            ))}
          </dl>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-[15px]">
          <caption className="sr-only">Exemplos de limites por imposto devido</caption>
          <thead>
            <tr className="bg-sand text-left">
              {keys.map((key) => (
                <th key={key} scope="col" className="p-2 align-bottom font-semibold">
                  {exampleLabel(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-border border-b">
                {keys.map((key) => (
                  <td key={key} className="tabular p-2">
                    {formatBRL(row[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
