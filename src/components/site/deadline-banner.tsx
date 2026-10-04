"use client";

import { useEffect, useSyncExternalStore } from "react";
import { site } from "@/config/site";
import { subscribeNoop, track } from "@/lib/analytics";
import { daysLeftBand, deadlineInfo, formatDateBr, todayInBrazil } from "./deadline";

const getToday = () => todayInBrazil();
const getServerToday = () => null;

// Faixa de prazo (seção 7.4): fundo areia, dias úteis restantes em acento, texto do prazo e fonte.
// Calculada no cliente depois da montagem (as páginas são estáticas) e sem animação (seção 7.6).
// Aparece só em novembro e dezembro. Dias úteis bancários conforme src/config/site.ts [verificar].
export function DeadlineBanner({ className = "" }: { className?: string }) {
  // Data de hoje só no cliente (no servidor, null): a página é estática e a faixa não entra no HTML.
  const today = useSyncExternalStore(subscribeNoop, getToday, getServerToday);
  const info = today ? deadlineInfo(today, site.deadline) : null;
  const daysLeft = info?.businessDaysLeft ?? null;

  useEffect(() => {
    if (daysLeft !== null)
      track("deadline_banner_view", { days_left_band: daysLeftBand(daysLeft) });
  }, [daysLeft]);

  if (!info) return null;
  const days = info.businessDaysLeft;
  return (
    <aside
      aria-label="Prazo do depósito para valer neste ano"
      className={`bg-sand border-border border-y ${className}`}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-4 md:flex-row md:items-baseline md:gap-4">
        <p className="site-number text-[2rem] md:text-[2.5rem]">
          {info.isLastDay ? "Hoje" : `${days} ${days === 1 ? "dia útil" : "dias úteis"}`}
        </p>
        <p className="text-foreground">
          {info.isLastDay
            ? "é o último dia útil bancário para o depósito valer no imposto deste ano"
            : `até o último dia útil bancário de dezembro (${formatDateBr(info.deadline)}), prazo para o depósito valer no imposto deste ano`}{" "}
          <span className="text-muted-foreground text-[13px]">
            {site.deadline.verifyNote} Fonte: calendário bancário da Febraban; Lei 8.313/1991, art.
            18 e 26; Lei 9.250/1995, art. 12.
          </span>
        </p>
      </div>
    </aside>
  );
}
