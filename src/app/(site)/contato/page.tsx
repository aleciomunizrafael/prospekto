import type { Metadata } from "next";
import { TrackLink } from "@/components/analytics/track-link";
import { ContactForm } from "@/components/site/lead-forms/contact-form";
import { SectionHeader } from "@/components/site/section-header";
import { WhatsappButton } from "@/components/site/whatsapp-button";
import { site } from "@/config/site";

// Contato (docs/site/estrutura-e-copy.md, seções 4.6 e 5.5): três caminhos e formulário curto;
// o assunto define o pipeline do lead.
export const metadata: Metadata = {
  title: { absolute: "Contato · Prospekto Consultoria & Projetos" },
  description: "Fale com a Prospekto por WhatsApp, e-mail ou formulário. Serra Gaúcha, RS.",
  alternates: { canonical: "/contato" },
};

export default function ContatoPage() {
  return (
    <>
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-16 pb-12 md:pt-24">
        <SectionHeader
          as="h1"
          label="Contato"
          title="Conte o que você quer realizar."
          subtitle="Três caminhos: WhatsApp, e-mail ou o formulário abaixo. Respostas em até 1 dia útil [verificar com a Daniela]."
        />
        <ul className="grid gap-6 sm:grid-cols-3">
          <li className="border-border flex flex-col gap-2 rounded-lg border p-5">
            <p className="site-label">WhatsApp</p>
            <p className="text-muted-foreground">{site.whatsappDisplay}</p>
            <WhatsappButton label="Abrir o WhatsApp" context="page" className="self-start" />
          </li>
          <li className="border-border flex flex-col gap-2 rounded-lg border p-5">
            <p className="site-label">E-mail</p>
            <TrackLink
              event="email_click"
              href={`mailto:${site.email}`}
              className="touch-target inline-flex items-center underline underline-offset-4"
            >
              {site.email}
            </TrackLink>
          </li>
          <li className="border-border flex flex-col gap-2 rounded-lg border p-5">
            <p className="site-label">Endereço e horário</p>
            <p className="text-muted-foreground">
              {site.legal.address ? `${site.city}, ${site.legal.address}` : site.city}
            </p>
            <p className="text-muted-foreground">Horário de atendimento [verificar]</p>
          </li>
        </ul>
      </section>

      <section aria-labelledby="formulario-contato" className="bg-sand">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 md:py-24 lg:grid-cols-[1fr_1.2fr]">
          <SectionHeader
            id="formulario-contato"
            label="Formulário"
            title="Escreva para a Prospekto."
            subtitle="Escolha o assunto para a mensagem chegar ao fluxo certo. Campos marcados com (obrigatório) precisam ser preenchidos."
          />
          <ContactForm titleId="formulario-contato" />
        </div>
      </section>
    </>
  );
}
