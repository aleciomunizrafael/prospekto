"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { siteButtonClass } from "@/components/analytics/track-link";
import { site, waLink } from "@/config/site";
import { currentPath, track } from "@/lib/analytics";
import {
  formatBRL,
  formatPercent,
  formatRange,
  renderText,
  simulate,
  textsFor,
  type LimitsBlock,
  type SimulatorResult,
  type TextKey,
} from "@/lib/simulator";
import { BaseBlock } from "./base-block";
import { ComparisonBlock } from "./comparison";
import { LicRsBlock } from "./lic-rs-block";
import { MechanismTable } from "./mechanism-table";
import { Notice } from "./notice";
import type { SimulatorDetailData, SimulatorGateOutcome } from "./state";
import { ExamplesTable } from "./summary";
import {
  LC224_LABEL,
  diagnosticHref,
  formatDateTimeBr,
  formatIsoDate,
  noticeKeys,
  projectsHref,
  warningText,
  whatsappMessage,
} from "./view-model";

// Tela 4 (simulador-spec.md, 5.2 e 10): resultado detalhado, reutilizado por /simulador (após o
// gate) e por /simulador/resultado/[token]. Blocos 1 a 7: base de cálculo, interruptor da LC 224
// (recalcula no cliente com simulate()), tabela por mecanismo, comparação pagar contra patrocinar,
// cenários com e sem LC 224, LIC-RS, prazos, próximo passo e nota técnica com fontes.
// "Baixar PDF" fica para a versão 1.1 e não aparece.
type Props = {
  data: SimulatorDetailData;
  outcome?: SimulatorGateOutcome;
  emailTo?: string | null;
  onRestart?: () => void;
};

// Textos com bloco próprio na tela: não repetem na nota técnica.
const SHOWN_ELSEWHERE: ReadonlySet<TextKey> = new Set<TextKey>([
  "disclaimer_main",
  "base_pj",
  "basket_pj",
  "pf_basket",
  "lc224_notice",
  "lic_rs_notice",
  "no_icms",
  "pj_quarterly",
  "pj_period",
  "pf_deadline",
  "sources_footer",
  "unknown_regime",
  "unknown_model",
  "params_stale",
]);

function Block({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-titulo`} className="flex flex-col gap-4">
      <h2 id={`${id}-titulo`} className="site-h3 flex items-baseline gap-3">
        <span className="text-brand tabular text-base font-semibold">
          {String(number).padStart(2, "0")}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ScenarioColumn({ title, limits }: { title: string; limits: LimitsBlock }) {
  return (
    <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
      <h3 className="font-semibold">{title}</h3>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-[15px]">
        {limits.mechanisms.map((row) => (
          <div key={row.key} className="contents">
            <dt className="text-muted-foreground">
              {row.name} ({formatPercent(row.effective_percent)})
            </dt>
            <dd className="tabular text-right">{formatRange(row.limit)}</dd>
          </div>
        ))}
        <div className="contents">
          <dt className="border-border border-t pt-2 font-semibold">Cesta cultural</dt>
          <dd className="border-border tabular border-t pt-2 text-right font-semibold">
            {formatRange(limits.cultural_basket)}
          </dd>
        </div>
        <div className="contents">
          <dt className="font-semibold">Total dos incentivos</dt>
          <dd className="tabular text-right font-semibold">{formatRange(limits.total)}</dd>
        </div>
      </dl>
    </div>
  );
}

export function SimulatorDetail({ data, outcome, emailTo, onRestart }: Props) {
  const { input } = data;
  const [applyLc224, setApplyLc224] = useState(data.result.lc224.applied);
  const tracked = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  // O interruptor recalcula no cliente; sem mudança, usa o resultado gravado.
  const result: SimulatorResult = useMemo(() => {
    if (applyLc224 === data.result.lc224.applied) return data.result;
    return simulate({ ...input, apply_lc224: applyLc224 });
  }, [applyLc224, data.result, input]);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    track("simulator_detail_view", {
      taxpayer_type: input.taxpayer_type,
      lc224_applied: data.result.lc224.applied,
    });
  }, [input.taxpayer_type, data.result.lc224.applied]);

  const notices = noticeKeys(result);
  const diagnostic = diagnosticHref(data.gate, input.taxpayer_type, data.simulationId);
  const whatsapp = waLink(whatsappMessage(input, result));
  const techTexts = textsFor(result).filter((key) => !SHOWN_ELSEWHERE.has(key));
  const paramsDate = formatIsoDate(result.parameters_version);
  let blockNumber = 0;
  const next = () => ++blockNumber;

  return (
    <div className="flex flex-col gap-12 pb-24 md:pb-0">
      <header className="flex flex-col gap-4">
        <p className="site-label">Resultado detalhado</p>
        <h1 ref={heading} tabIndex={-1} className="site-h2 outline-none">
          Simulação de {data.subject}, {formatDateTimeBr(data.createdAt)}
        </h1>
        <p className="text-muted-foreground">Parâmetros de {paramsDate}.</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={diagnostic}
            className={siteButtonClass("primary")}
            onClick={() =>
              track("cta_click", { cta_id: "simulator_detail_diagnostic", path: currentPath() })
            }
          >
            Agendar diagnóstico
          </Link>
          {onRestart ? (
            <button type="button" onClick={onRestart} className={siteButtonClass("outline")}>
              Nova simulação
            </button>
          ) : (
            <Link href="/simulador" className={siteButtonClass("outline")}>
              Nova simulação
            </Link>
          )}
        </div>
        {emailTo ? (
          <Notice kind="success">
            <p>Resultado enviado para {emailTo}. O link do e-mail vale por 30 dias.</p>
          </Notice>
        ) : null}
        {outcome === "lead_save_failed" ? (
          <Notice kind="warning" title="Não conseguimos registrar seu contato">
            <p>
              O resultado está abaixo mesmo assim. Nossa equipe foi avisada; se quiser garantir o
              contato, escreva para {site.email} ou fale pelo WhatsApp.
            </p>
          </Notice>
        ) : null}
        {outcome === "deduplicated" ? (
          <Notice kind="info">
            <p>Já recebemos seu contato há poucos minutos; o e-mail anterior continua válido.</p>
          </Notice>
        ) : null}
        {notices.map((key) => (
          <Notice key={key} kind="warning">
            <p>{warningText(result, key)}</p>
          </Notice>
        ))}
        {result.status === "disqualified" ? (
          <Notice
            kind="warning"
            title={
              input.taxpayer_type === "pj" ? "Regime fora do lucro real" : "Modelo simplificado"
            }
          >
            <p>
              {renderText(
                result.disqualified?.reason === "regime"
                  ? "disqualified_regime"
                  : "disqualified_model",
              )}
            </p>
            {result.disqualified?.reason === "regime" && result.lic_rs ? (
              <p>{renderText("disqualified_regime_lic_rs")}</p>
            ) : null}
          </Notice>
        ) : null}
        {result.status === "no_tax" ? (
          <Notice kind="warning" title="Sem imposto devido">
            <p>{renderText("no_tax")}</p>
          </Notice>
        ) : null}
      </header>

      {result.base ? (
        <Block id="bloco-base" number={next()} title="Base de cálculo">
          <BaseBlock base={result.base} input={input} />
        </Block>
      ) : null}

      {result.lc224.available && result.limits ? (
        <Block id="bloco-lc224" number={next()} title={`Redução da ${LC224_LABEL}`}>
          <label className="touch-target flex items-start gap-3">
            <input
              type="checkbox"
              role="switch"
              aria-checked={applyLc224}
              checked={applyLc224}
              onChange={(event) => setApplyLc224(event.target.checked)}
              className="accent-primary mt-1 size-5 shrink-0"
            />
            <span className="font-medium">
              Aplicar redução da {LC224_LABEL}{" "}
              <span className="text-muted-foreground font-normal">
                (limite de cultura a{" "}
                {formatPercent(result.lc224.applied ? 4 * result.lc224.factor : 4)})
              </span>
            </span>
          </label>
          <Notice kind="warning">
            <p>{renderText("lc224_notice")}</p>
          </Notice>
        </Block>
      ) : null}

      {result.limits ? (
        <Block id="bloco-mecanismos" number={next()} title="Limite por mecanismo">
          <MechanismTable
            limits={result.limits}
            taxpayerType={input.taxpayer_type}
            id="tabela-mecanismos"
          />
        </Block>
      ) : null}

      {result.examples ? (
        <Block id="bloco-exemplos" number={next()} title="Exemplos por imposto devido">
          <p className="site-prose">{renderText("band_examples")}</p>
          <ExamplesTable rows={result.examples} />
        </Block>
      ) : null}

      {result.limits || result.lic_rs?.status === "ok" ? (
        <Block id="bloco-comparacao" number={next()} title="Pagar imposto ou patrocinar">
          <ComparisonBlock input={input} result={result} />
        </Block>
      ) : null}

      {result.scenarios ? (
        <Block id="bloco-cenarios" number={next()} title={`Cenários com e sem a ${LC224_LABEL}`}>
          <div className="grid gap-4 md:grid-cols-2">
            <ScenarioColumn
              title={`Com a redução (${LC224_LABEL}, fator ${String(result.lc224.factor).replace(".", ",")})`}
              limits={result.scenarios.with_lc224}
            />
            <ScenarioColumn title="Sem a redução" limits={result.scenarios.without_lc224} />
          </div>
          <p className="text-muted-foreground text-[14px] leading-snug">
            {renderText("lc224_notice")}
          </p>
        </Block>
      ) : null}

      {result.lic_rs ? (
        <Block id="bloco-lic-rs" number={next()} title="LIC-RS (ICMS)">
          <LicRsBlock lic={result.lic_rs} />
        </Block>
      ) : null}

      <Block id="bloco-prazos" number={next()} title="Prazos e próximos passos">
        <ul className="site-prose flex list-disc flex-col gap-2 pl-5">
          {result.deadlines.map((deadline) => (
            <li key={deadline.key}>{deadline.text}</li>
          ))}
          {input.taxpayer_type === "pf" ? <li>{renderText("pf_deadline")}</li> : null}
          <li>A Prospekto cuida de termo, recibo e prestação de contas.</li>
        </ul>
        <div className="flex flex-wrap gap-3">
          <Link
            href={diagnostic}
            className={siteButtonClass("primary")}
            onClick={() =>
              track("cta_click", {
                cta_id: "simulator_detail_diagnostic_bottom",
                path: currentPath(),
              })
            }
          >
            Agendar diagnóstico gratuito com a Daniela e o seu contador
          </Link>
          <Link
            href={projectsHref(result)}
            className={siteButtonClass("outline")}
            onClick={() =>
              track("cta_click", { cta_id: "simulator_detail_projects", path: currentPath() })
            }
          >
            Ver projetos em captação
          </Link>
        </div>
      </Block>

      <Block id="nota-tecnica" number={next()} title="Nota técnica e fontes">
        <div className="site-prose text-muted-foreground flex flex-col gap-3 text-[15px]">
          <p>{renderText("disclaimer_main", { atualizado_em: paramsDate })}</p>
          {techTexts.map((key) => (
            <p key={key}>
              {renderText(key, {
                atualizado_em: paramsDate,
                teto: result.comparison ? formatBRL(result.comparison.cap) : "",
                economia_min: result.comparison
                  ? formatBRL(result.comparison.operating_savings.min)
                  : "",
                economia_max: result.comparison
                  ? formatBRL(
                      result.comparison.operating_savings.max ??
                        result.comparison.operating_savings.min,
                    )
                  : "",
              })}
            </p>
          ))}
          <p>{renderText("sources_footer", { atualizado_em: paramsDate })}</p>
        </div>
        {result.sources.length ? (
          <ol className="text-muted-foreground flex flex-col gap-1 text-[14px]">
            {result.sources.map((source, index) => (
              <li key={source.key} className="flex gap-2">
                <span className="text-brand tabular shrink-0 font-semibold">{index + 1}.</span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 break-all"
                >
                  {source.key.replace(/_/g, " ")}
                </a>
              </li>
            ))}
          </ol>
        ) : null}
      </Block>

      {/* Rodapé fixo no celular: diagnóstico e WhatsApp (tela 4). */}
      <div className="bg-background border-border fixed inset-x-0 bottom-0 z-10 flex gap-2 border-t p-3 md:hidden">
        <Link href={diagnostic} className={siteButtonClass("primary", "flex-1 justify-center")}>
          Agendar diagnóstico
        </Link>
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={siteButtonClass("outline", "flex-1 justify-center")}
          onClick={() => track("whatsapp_click", { context: "floating", path: currentPath() })}
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}
