import type { Metadata } from "next";
import { LeadCreateForm } from "@/components/crm/forms/lead-create-form";
import { PageHeader } from "@/components/crm/ui/page-header";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Novo lead" };

// Novo lead (crm-design-system.md, seção 7.5): sete campos à vista, o resto dobrado.
export default async function NewLeadPage() {
  await requireSession();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="Novo lead"
        description="Para prospecção ativa, indicação ou evento. Se o e-mail já existir no mesmo segmento, o lead existente é atualizado."
      />
      <LeadCreateForm />
    </div>
  );
}
