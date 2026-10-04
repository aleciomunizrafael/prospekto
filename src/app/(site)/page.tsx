import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { site, waLink } from "@/config/site";

// Mensagem central da Home (docs/site/estrutura-e-copy.md, seção 4.1).
// Só rótulo, título, subtítulo e CTAs; os demais blocos entram na tarefa do site.
export default function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <p className="text-xs font-medium tracking-[0.08em] uppercase">
        Prospekto Consultoria &amp; Projetos · Serra Gaúcha
      </p>
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Transforme o imposto da sua empresa em cultura na Serra Gaúcha, sem burocracia.
      </h1>
      <p className="text-muted-foreground max-w-prose text-lg leading-relaxed">
        Empresas tributadas pelo lucro real podem destinar até 4% do imposto de renda devido a
        projetos culturais aprovados pelo Ministério da Cultura. O valor sai do imposto que já seria
        pago; a diferença é que ele vira um projeto com a sua marca, aqui na região. A Prospekto
        cuida do processo. O seu contador só lança a dedução.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/simulador" className={buttonVariants({ size: "lg" })}>
          Simular quanto cabe na minha empresa
        </Link>
        <a
          href={waLink(site.whatsappMessages.home)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          Falar com a Daniela no WhatsApp
        </a>
      </div>
    </section>
  );
}
