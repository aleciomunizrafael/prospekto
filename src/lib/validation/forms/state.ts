// Estado devolvido pela Server Action createLeadFromForm ao useActionState (src/actions/leads.ts).
// Fica fora do arquivo "use server" porque módulos de Server Action só exportam funções assíncronas.
export type LeadFormState = {
  status: "idle" | "error";
  // Mensagem geral, mostrada no resumo de erros com foco (estrutura-e-copy.md, seção 5.1).
  message?: string;
  // Primeira mensagem por campo, na ordem do formulário; chave = atributo `name` do campo.
  fieldErrors?: Record<string, string>;
  // Código estável para analytics (`form_error.error_code`): validation, rate_limited, token, storage.
  errorCode?: "validation" | "rate_limited" | "token" | "storage" | "unknown_form";
  // Valores enviados, para repovoar os campos depois de um erro (sem honeypot nem carimbo).
  values?: Record<string, string>;
};

export const initialLeadFormState: LeadFormState = { status: "idle" };
