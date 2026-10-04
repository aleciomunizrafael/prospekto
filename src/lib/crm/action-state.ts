// Estado comum devolvido pelas Server Actions do CRM ao useActionState. Fica fora dos arquivos
// "use server" porque módulos de Server Action só exportam funções assíncronas.
export type CrmActionState = {
  status: "idle" | "error" | "ok";
  message?: string;
  fieldErrors?: Record<string, string>;
  // "Mover para": lista do que falta para o movimento (MissingFieldsError), em português.
  missing?: string[];
  values?: Record<string, string>;
};

export const initialCrmActionState: CrmActionState = { status: "idle" };

export function firstIssueByField(
  issues: readonly { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !(key in out)) out[key] = issue.message;
  }
  return out;
}

export function formDataToStrings(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}
