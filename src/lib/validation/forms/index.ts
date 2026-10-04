// Registro dos formulários públicos: a Server Action createLeadFromForm escolhe o schema e o
// mapeamento para lead pelo campo oculto `form_id`. Para criar um formulário novo, ver
// src/actions/README.md. Os ids seguem a seção 9.2 de estrutura-e-copy.md (`form_id`).
import type { FormDefinition } from "./common";
import { avisoProjetosForm } from "./aviso-projetos";
import { contadoresForm } from "./contadores";
import { contadoresWebinarForm } from "./contadores-webinar";
import { contatoForm } from "./contato";
import { diagnosticoForm } from "./diagnostico";
import { guiaAvisoForm, guiaForm } from "./guia";
import { mentoriaForm } from "./mentoria";
import { municipiosForm } from "./municipios";
import { proponentesForm } from "./proponentes";

export const FORMS = {
  guide: guiaForm,
  guide_notify: guiaAvisoForm,
  contact: contatoForm,
  projects_notify: avisoProjetosForm,
  diagnostic: diagnosticoForm,
  accountant: contadoresForm,
  accountant_webinar: contadoresWebinarForm,
  municipality: municipiosForm,
  proponent: proponentesForm,
  waitlist: mentoriaForm,
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
export * from "./diagnostico";
export * from "./contadores";
export * from "./contadores-webinar";
export * from "./municipios";
export * from "./proponentes";
export * from "./mentoria";
