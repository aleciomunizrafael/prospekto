import { describe, expect, it } from "vitest";
import {
  CONSENT_REQUIRED_MESSAGE,
  checkboxField,
  consentFields,
  emailField,
  formDataToObject,
  FORMS,
  getForm,
  hiddenFieldsSchema,
  phoneField,
  THANKS_TYPES,
  ufField,
} from "@/lib/validation/forms";
import { contatoFormSchema, segmentForSubject } from "@/lib/validation/forms/contato";
import { guiaFormSchema, nameFromEmail, segmentForProfile } from "@/lib/validation/forms/guia";
import { z } from "zod";

describe("campos padrão (seção 5.1)", () => {
  it("UF aceita minúsculas e espaços e recusa valor fora das 27", () => {
    expect(ufField.parse(" rs ")).toBe("RS");
    expect(ufField.parse("SP")).toBe("SP");
    const bad = ufField.safeParse("XX");
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.error.issues[0].message).toBe("Informe uma UF válida.");
    expect(ufField.safeParse("").success).toBe(false);
  });

  it("telefone opcional: vazio vira undefined; com máscara vira E.164; curto é erro", () => {
    expect(phoneField.parse("")).toBeUndefined();
    expect(phoneField.parse(undefined)).toBeUndefined();
    expect(phoneField.parse("(54) 98403-2180")).toBe("+5554984032180");
    expect(phoneField.parse("+55 54 3222-1234")).toBe("+555432221234");
    expect(phoneField.parse("55 54 98403 2180")).toBe("+5554984032180");
    const bad = phoneField.safeParse("123");
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.error.issues[0].message).toMatch(/DDD/);
  });

  it("e-mail é normalizado em minúsculas e sem espaços; inválido tem mensagem concreta", () => {
    expect(emailField.parse("  Maria@Empresa.COM.BR ")).toBe("maria@empresa.com.br");
    const bad = emailField.safeParse("maria@");
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.error.issues[0].message).toBe("Informe um e-mail válido.");
    expect(emailField.safeParse("").success).toBe(false);
  });

  it("caixas: 'on', 'true' e '1' marcam; ausente ou vazio não; caixa 1 é obrigatória", () => {
    expect(checkboxField.parse("on")).toBe(true);
    expect(checkboxField.parse("true")).toBe(true);
    expect(checkboxField.parse("1")).toBe(true);
    expect(checkboxField.parse("")).toBe(false);
    expect(checkboxField.parse(undefined)).toBe(false);
    const schema = z.object(consentFields);
    expect(schema.parse({ consent_lgpd: "on" })).toEqual({
      consent_lgpd: true,
      consent_marketing: false,
    });
    const missing = schema.safeParse({ consent_marketing: "on" });
    expect(missing.success).toBe(false);
    if (!missing.success) {
      expect(missing.error.issues[0].path).toEqual(["consent_lgpd"]);
      expect(missing.error.issues[0].message).toBe(CONSENT_REQUIRED_MESSAGE);
    }
  });

  it("campos ocultos têm padrão vazio e form_id obrigatório", () => {
    expect(hiddenFieldsSchema.parse({ form_id: "contact" })).toEqual({
      form_id: "contact",
      utm_source: "",
      utm_medium: "",
      utm_campaign: "",
      referrer: "",
      landing_path: "",
      source_page: "",
      form_ts: "",
      website: "",
    });
    expect(hiddenFieldsSchema.safeParse({}).success).toBe(false);
  });

  it("formDataToObject ignora chaves internas $ACTION e fica com o primeiro valor", () => {
    const fd = new FormData();
    fd.append("$ACTION_ID_x", "1");
    fd.append("nome", "A");
    fd.append("nome", "B");
    fd.append("arquivo", new Blob(["x"]));
    expect(formDataToObject(fd)).toEqual({ nome: "A" });
  });
});

describe("registro de formulários", () => {
  it("getForm só reconhece ids registrados e todo formulário aponta para um tipo de obrigado válido", () => {
    expect(getForm("contact")?.id).toBe("contact");
    expect(getForm("nope")).toBeNull();
    expect(getForm("__proto__")).toBeNull();
    for (const key of Object.keys(FORMS)) expect(getForm(key)?.id).toBe(key);
    expect(THANKS_TYPES).toHaveLength(8);
  });

  it("contato: o assunto define segmento, interesse e tag triagem", () => {
    expect(segmentForSubject("patrocinar")).toEqual({
      segment: "PJ",
      interest: "rouanet",
      tags: [],
    });
    expect(segmentForSubject("contador").segment).toBe("CONT");
    expect(segmentForSubject("pessoa_fisica").segment).toBe("PF");
    expect(segmentForSubject("municipio")).toMatchObject({
      segment: "MUN",
      interest: "consultoria",
    });
    expect(segmentForSubject("proponente").segment).toBe("PROP");
    expect(segmentForSubject("mentoria")).toMatchObject({ segment: "ALUNO", interest: "mentoria" });
    expect(segmentForSubject("imprensa").tags).toEqual(["triagem"]);
    expect(segmentForSubject("outro").tags).toEqual(["triagem"]);
    const parsed = contatoFormSchema.parse({
      form_id: "contact",
      nome: " Maria ",
      email: "M@X.COM",
      assunto: "municipio",
      empresa: "Prefeitura",
      mensagem: "Olá",
      consent_lgpd: "on",
    });
    const draft = getForm("contact")!.toLead(parsed);
    expect(draft.segment).toBe("MUN");
    expect(draft.attributes).toEqual({ assunto: "municipio", municipio: "Prefeitura" });
    expect(draft.thanksType).toBe("contato");
    expect(draft.emailTemplate.id).toBe("contato");
  });

  it("guia: perfil define segmento; outro vira PJ com perfil_outro; nome a partir do e-mail", () => {
    expect(segmentForProfile("empresa")).toEqual({ segment: "PJ", tags: [] });
    expect(segmentForProfile("contador").segment).toBe("CONT");
    expect(segmentForProfile("pessoa_fisica").segment).toBe("PF");
    expect(segmentForProfile("outro")).toEqual({ segment: "PJ", tags: ["perfil_outro"] });
    expect(nameFromEmail("maria.silva@empresa.com.br")).toBe("maria silva");
    expect(nameFromEmail("a@x.com")).toBe("Contato pelo site");
    const bad = guiaFormSchema.safeParse({
      form_id: "guide",
      nome: "M",
      email: "x",
      perfil: "chefe",
      cidade: "",
      uf: "ZZ",
      consent_lgpd: "",
    });
    expect(bad.success).toBe(false);
    if (!bad.success) {
      const paths = bad.error.issues.map((i) => String(i.path[0]));
      expect(paths).toEqual(
        expect.arrayContaining(["nome", "email", "perfil", "cidade", "uf", "consent_lgpd"]),
      );
    }
  });
});
