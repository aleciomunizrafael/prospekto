"use client";

import Link from "next/link";
import { site } from "@/config/site";
import { CheckboxField } from "./field";

// As duas caixas de consentimento (seção 5.1), com os textos exatos de src/config/site.ts, nenhuma
// pré-marcada, e o texto fixo abaixo com a versão da política. Os nomes dos campos (consent_lgpd,
// consent_marketing) são os que consentFields de src/lib/validation/forms/common.ts espera.
export function ConsentFields() {
  return (
    <div className="border-border flex flex-col gap-4 rounded-lg border p-4">
      <CheckboxField
        name="consent_lgpd"
        required
        label={
          <>
            Li a{" "}
            <Link href="/privacidade" className="underline underline-offset-4">
              Política de Privacidade
            </Link>{" "}
            e autorizo a Prospekto Consultoria &amp; Projetos a usar meus dados para responder a
            esta solicitação e entrar em contato por e-mail ou telefone sobre ela.
          </>
        }
      />
      <CheckboxField name="consent_marketing" label={site.consent.marketing} />
      <p className="text-muted-foreground text-[14px] leading-snug">
        {site.consent.footer} Política de privacidade, versão {site.policyVersion}.
      </p>
    </div>
  );
}
