"use server";

// Server Actions da Prospecção (ADR-004, 6.6; plano, frente C). Toda função começa com
// requireSession() (AGENTS.md; tests/auth-guard.test.ts): Server Actions são alcançáveis por POST
// direto. Validação com Zod e safeParse antes de qualquer acesso a campo (regra 10); escrita só
// pelos repositórios (R-15); depois de gravar, refresh() ou redirect. Logs só com ids e status:
// nunca nome, telefone, e-mail nem o texto da mensagem (R-16).
import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { formDataToStrings, type CrmActionState } from "@/lib/crm/action-state";
import { fromDateTimeLocal } from "@/lib/crm/format";
import { failFrom, fieldErrorsFrom, ok, type ActionState } from "@/lib/crm/form-state";
import { parseProspectingPaste } from "@/lib/crm/prospecting-paste";
import {
  callResultToast,
  describeConversion,
  pasteResultToast,
  type ConversionResult,
} from "@/lib/crm/prospecting-view";
import { DomainError } from "@/lib/errors";
import { log } from "@/lib/log";
import {
  addItems,
  convertProspectingItem,
  createList,
  deleteItem,
  deleteList,
  recordCallResult,
  recordWhatsappSent,
  updateItemField,
  updateList,
} from "@/lib/repos/prospecting";
import { requireSession } from "@/lib/session";
import { uuidSchema } from "@/lib/validation/common";
import {
  convertItemSchema,
  createListSchema,
  newItemSchema,
  pasteItemsSchema,
  recordCallResultSchema,
  recordWhatsappSentSchema,
  updateItemFieldSchema,
  updateListSchema,
} from "@/lib/validation/prospecting";

function invalid(error: z.ZodError): ActionState {
  return {
    status: "error",
    message: "Confira os campos destacados.",
    fieldErrors: fieldErrorsFrom(error),
  };
}

function fail(message: string): ActionState {
  return { status: "error", message };
}

// Erro de domínio vira a própria mensagem; o inesperado vai ao log (só ids) e vira a genérica.
function handle(error: unknown, context: string, fields: Record<string, unknown>): ActionState {
  if (!(error instanceof DomainError) && !(error instanceof z.ZodError)) {
    log("error", `falha em ${context}`, { ...fields, error });
  }
  return failFrom(error);
}

const blank = (v: string | undefined) => (v && v.trim() ? v : undefined);

// ------------------------------------------------------------------------------------------
// Listas
// ------------------------------------------------------------------------------------------

export async function createListAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireSession();
  const v = formDataToStrings(fd);
  const parsed = createListSchema.safeParse({
    name: v.name,
    region: blank(v.region),
    notes: blank(v.notes),
    sourceDetail: v.sourceDetail,
    assigneeUserId: blank(v.assigneeUserId),
  });
  if (!parsed.success) return invalid(parsed.error);
  let listId: string;
  try {
    const list = await createList(ctx, parsed.data);
    listId = list.id;
  } catch (error) {
    return handle(error, "createListAction", { tenantId: ctx.tenantId, userId: ctx.userId });
  }
  log("info", "lista de prospecção criada", { tenantId: ctx.tenantId, userId: ctx.userId, listId });
  revalidatePath("/app/prospeccao");
  redirect(`/app/prospeccao/${listId}`);
}

export async function updateListAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireSession();
  const v = formDataToStrings(fd);
  const parsed = updateListSchema.safeParse({
    listId: v.listId,
    name: v.name,
    region: blank(v.region) ?? null,
    notes: blank(v.notes) ?? null,
    sourceDetail: v.sourceDetail,
    assigneeUserId: blank(v.assigneeUserId) ?? null,
  });
  if (!parsed.success) return invalid(parsed.error);
  try {
    await updateList(ctx, parsed.data);
  } catch (error) {
    return handle(error, "updateListAction", {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      listId: parsed.data.listId,
    });
  }
  log("info", "lista de prospecção atualizada", {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    listId: parsed.data.listId,
  });
  refresh();
  return ok("Lista salva.");
}

export async function deleteListAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireSession();
  const parsed = uuidSchema.safeParse(fd.get("listId"));
  if (!parsed.success) return fail("Lista não encontrada.");
  try {
    await deleteList(ctx, parsed.data);
  } catch (error) {
    return handle(error, "deleteListAction", {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      listId: parsed.data,
    });
  }
  log("info", "lista de prospecção excluída", {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    listId: parsed.data,
  });
  revalidatePath("/app/prospeccao");
  redirect("/app/prospeccao");
}

// ------------------------------------------------------------------------------------------
// Itens: adicionar um, colar vários
// ------------------------------------------------------------------------------------------

export async function addItemAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireSession();
  const v = formDataToStrings(fd);
  const listId = uuidSchema.safeParse(v.listId);
  if (!listId.success) return fail("Lista não encontrada.");
  const parsed = newItemSchema.safeParse({
    name: v.name,
    phone: blank(v.phone),
    segment: blank(v.segment),
    hook: blank(v.hook),
  });
  if (!parsed.success) return invalid(parsed.error);
  let alreadyDiscarded = 0;
  try {
    const result = await addItems(ctx, { listId: listId.data, items: [parsed.data] });
    alreadyDiscarded = result.alreadyDiscarded;
  } catch (error) {
    return handle(error, "addItemAction", {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      listId: listId.data,
    });
  }
  log("info", "empresa adicionada à prospecção", {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    listId: listId.data,
    alreadyDiscarded,
  });
  refresh();
  return ok(
    alreadyDiscarded > 0
      ? "Empresa adicionada; ela já foi descartada em outra lista (veja a anotação)."
      : "Empresa adicionada.",
  );
}

// O texto bruto chega inteiro e é reinterpretado aqui (fonte única; a prévia do diálogo usa a
// mesma função no cliente).
export async function pasteItemsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireSession();
  const v = formDataToStrings(fd);
  const parsed = pasteItemsSchema.safeParse({ listId: v.listId, text: v.text ?? "" });
  if (!parsed.success) return invalid(parsed.error);
  const { items } = parseProspectingPaste(parsed.data.text);
  if (items.length === 0) {
    return fail(
      "Nenhuma empresa reconhecida. Cole uma empresa por linha: Nome | Telefone | Abertura.",
    );
  }
  let added = 0;
  let alreadyDiscarded = 0;
  try {
    const result = await addItems(ctx, {
      listId: parsed.data.listId,
      items: items.map((i) => ({
        name: i.name,
        segment: i.segment ?? undefined,
        phone: i.phone ?? undefined,
        hook: i.hook ?? undefined,
        info: i.info ?? undefined,
      })),
    });
    added = result.items.length;
    alreadyDiscarded = result.alreadyDiscarded;
  } catch (error) {
    return handle(error, "pasteItemsAction", {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      listId: parsed.data.listId,
    });
  }
  log("info", "lista de prospecção colada", {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    listId: parsed.data.listId,
    added,
    alreadyDiscarded,
  });
  refresh();
  return ok(pasteResultToast(added, alreadyDiscarded));
}

export async function deleteItemAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await requireSession();
  const parsed = z
    .object({ itemId: uuidSchema, listId: uuidSchema })
    .safeParse(formDataToStrings(fd));
  if (!parsed.success) return fail("Empresa não encontrada.");
  try {
    await deleteItem(ctx, parsed.data.itemId);
  } catch (error) {
    return handle(error, "deleteItemAction", {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      itemId: parsed.data.itemId,
    });
  }
  log("info", "empresa removida da prospecção", {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    listId: parsed.data.listId,
    itemId: parsed.data.itemId,
  });
  revalidatePath(`/app/prospeccao/${parsed.data.listId}`);
  redirect(`/app/prospeccao/${parsed.data.listId}`);
}

// ------------------------------------------------------------------------------------------
// Ficha: autosave, resultado da ligação, WhatsApp
// ------------------------------------------------------------------------------------------

const AUTOSAVE_ERROR: CrmActionState = {
  status: "error",
  message: "Não foi possível salvar; tente de novo",
};

// Chamada pelo AutosaveField com FormData { itemId, field, value } (regra 10: safeParse antes de
// qualquer acesso; argumento que não é FormData vira erro, nunca 500).
export async function updateItemFieldAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const ctx = await requireSession();
  if (!(formData instanceof FormData)) return AUTOSAVE_ERROR;
  const parsed = updateItemFieldSchema.safeParse(formDataToStrings(formData));
  if (!parsed.success) return AUTOSAVE_ERROR;
  try {
    await updateItemField(ctx, parsed.data);
  } catch (error) {
    if (error instanceof DomainError) return { status: "error", message: error.message };
    log("error", "falha em updateItemFieldAction", {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      itemId: parsed.data.itemId,
      field: parsed.data.field,
      error,
    });
    return AUTOSAVE_ERROR;
  }
  log("info", "campo da empresa salvo", {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    itemId: parsed.data.itemId,
    field: parsed.data.field,
  });
  refresh();
  return { status: "ok", message: "Salvo." };
}

export async function recordCallResultAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const ctx = await requireSession();
  const v = formDataToStrings(fd);
  const parsed = recordCallResultSchema.safeParse({
    itemId: v.itemId,
    status: blank(v.status),
    callbackAt: blank(v.callbackAt),
    reason: blank(v.reason),
    note: blank(v.note),
  });
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  try {
    await recordCallResult(ctx, d);
  } catch (error) {
    return handle(error, "recordCallResultAction", {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      itemId: d.itemId,
      status: d.status ?? null,
    });
  }
  log("info", d.status ? "resultado da ligação registrado" : "anotação da empresa salva", {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    itemId: d.itemId,
    status: d.status ?? null,
  });
  refresh();
  return ok(d.status ? callResultToast(d.status, d.callbackAt) : "Anotação salva.");
}

// Chamada direta pelo clique em "Abrir no WhatsApp" (não é formulário): o argumento é validado
// inteiro antes de qualquer acesso (regra 10).
export async function recordWhatsappSentAction(input: unknown): Promise<CrmActionState> {
  const ctx = await requireSession();
  const parsed = recordWhatsappSentSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "Mensagem inválida." };
  try {
    await recordWhatsappSent(ctx, parsed.data);
  } catch (error) {
    if (error instanceof DomainError) return { status: "error", message: error.message };
    log("error", "falha em recordWhatsappSentAction", {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      itemId: parsed.data.itemId,
      error,
    });
    return { status: "error", message: "Não foi possível registrar o WhatsApp." };
  }
  log("info", "whatsapp aberto pela prospecção", {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    itemId: parsed.data.itemId,
  });
  refresh();
  return { status: "ok", message: "WhatsApp aberto; registrado no histórico." };
}

// ------------------------------------------------------------------------------------------
// "Reunião marcada": conversão em organização, contato e lead (ADR-004, 6.6; P10)
// ------------------------------------------------------------------------------------------

export async function convertProspectingItemAction(
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const ctx = await requireSession();
  const v = formDataToStrings(fd);
  const meetingAt = v.meetingAt ? fromDateTimeLocal(v.meetingAt) : null;
  const parsed = convertItemSchema.safeParse({
    itemId: v.itemId,
    contactName: v.contactName,
    email: v.email,
    contactPhone: blank(v.contactPhone),
    title: blank(v.title),
    meetingAt: meetingAt ?? undefined,
    meetingKind: blank(v.meetingKind),
    taxRegime: blank(v.taxRegime),
    interest: blank(v.interest),
    ownerUserId: blank(v.ownerUserId),
  });
  if (!parsed.success) return invalid(parsed.error);
  let result: ConversionResult;
  try {
    result = await convertProspectingItem(ctx, parsed.data);
  } catch (error) {
    return handle(error, "convertProspectingItemAction", {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      itemId: parsed.data.itemId,
    });
  }
  log("info", "empresa convertida pela prospecção", {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    itemId: parsed.data.itemId,
    leadId: result.leadId,
    orgId: result.orgId,
    stage: result.stage,
    created: result.created,
    reactivated: result.reactivated,
  });
  refresh();
  const state: ActionState & { conversion: ConversionResult } = {
    ...ok(describeConversion(result)),
    conversion: result,
  };
  return state;
}
