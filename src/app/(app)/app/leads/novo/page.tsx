import type { Metadata } from "next";
import { LeadCreateForm } from "@/components/crm/forms/lead-create-form";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Novo lead" };

export default async function NewLeadPage() {
  await requireSession();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Novo lead</h1>
        <p className="text-muted-foreground text-sm">
          Para leads de prospecção ativa, indicação ou evento. Os formulários do site entram
          sozinhos. Se o e-mail já existir no mesmo segmento, o lead existente é atualizado.
        </p>
      </div>
      <LeadCreateForm />
    </div>
  );
}
