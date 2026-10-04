// Registro dos formulários públicos: a Server Action createLeadFromForm escolhe o schema e o
// mapeamento para lead pelo campo oculto `form_id`. Para criar um formulário novo, ver
// src/actions/README.md. Os ids seguem a seção 9.2 de estrutura-e-copy.md (`form_id`).
import type { FormDefinition } from "./common";
import { avisoProjetosForm } from "./aviso-projetos";
import { contatoForm } from "./contato";
import { guiaAvisoForm, guiaForm } from "./guia";

export const FORMS = {
  guide: guiaForm,
  guide_notify: guiaAvisoForm,
  contact: contatoForm,
  projects_notify: avisoProjetosForm,
} satisfies Record<string, FormDefinition>;

export type FormId = keyof typeof FORMS;

export function isFormId(value: string): value is FormId {
  return Object.hasOwn(FORMS, value);
}

export function getForm(id: string): FormDefinition | null {
  return isFormId(id) ? (FORMS[id] as FormDefinition) : null;
}

export * from "./common";
export * from "./guia";
export * from "./contato";
export * from "./aviso-projetos";
