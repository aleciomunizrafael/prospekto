"use client";

import { useSearchParams } from "next/navigation";
import { siteButtonClass } from "@/components/analytics/track-link";
import { site } from "@/config/site";

// Link de download do guia na página de obrigado (seção 10.3): o token assinado chega em `?t=` e
// vale 72 horas. Lido no cliente para a página continuar estática. Precisa de <Suspense>.
export function GuideDownloadLink() {
  const params = useSearchParams();
  const token = params.get("t");
  if (!site.guide.available || !token) {
    return (
      <p className="site-prose">
        {site.guide.available
          ? "O link de download foi enviado para o seu e-mail e vale por 72 horas."
          : "A edição revisada do guia está em fase final de revisão. Assim que estiver disponível, você recebe o link de download por e-mail."}
      </p>
    );
  }
  const href = `/api/downloads/guia?token=${encodeURIComponent(token)}&s=thanks_page`;
  return (
    <div className="flex flex-col gap-3">
      <p className="site-prose">
        Seu guia está pronto. O link vale por 72 horas; depois disso, peça de novo pelo site. O
        mesmo link foi enviado para o seu e-mail.
      </p>
      <a href={href} className={siteButtonClass("primary", "self-start")} download>
        Baixar o guia (PDF)
      </a>
    </div>
  );
}
