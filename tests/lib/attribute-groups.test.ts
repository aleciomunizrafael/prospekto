// Decisão D4 (crm-design-system.md): os grupos de AttributeFields cobrem todas as chaves de
// ATTRIBUTE_FIELDS (nada some do formulário) e o art. 27 fica sempre no seu próprio grupo.
import { describe, expect, it } from "vitest";
import {
  ART27_GROUP_TITLE,
  ART27_KEYS,
  countFilledAttributes,
  groupedAttributeFields,
} from "@/components/crm/forms/attribute-fields";
import { ATTRIBUTE_FIELDS } from "@/lib/crm/attributes";
import { LEAD_SEGMENTS } from "@/lib/domain/enums";

describe("grupos dos campos do segmento", () => {
  it.each(LEAD_SEGMENTS)("%s: todo campo aparece uma vez, na ordem original", (segment) => {
    const keys = groupedAttributeFields(segment).flatMap((g) => g.fields.map((f) => f.key));
    expect(keys.sort()).toEqual(ATTRIBUTE_FIELDS[segment].map((f) => f.key).sort());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("PJ e PF têm o grupo do art. 27 com os três campos; os outros não", () => {
    for (const segment of LEAD_SEGMENTS) {
      const art27 = groupedAttributeFields(segment).find((g) => g.title === ART27_GROUP_TITLE);
      if (segment === "PJ" || segment === "PF") {
        expect(art27?.fields.map((f) => f.key)).toEqual([...ART27_KEYS]);
      } else {
        expect(art27).toBeUndefined();
      }
    }
    expect(groupedAttributeFields("PJ").map((g) => g.title)).toEqual([
      "Empresa e regime",
      "Qualificação",
      ART27_GROUP_TITLE,
    ]);
  });

  it("conta os preenchidos para o título 'N de M preenchidos'", () => {
    expect(countFilledAttributes("PJ", { empresa: "Vale", cnpj: "", setor: null })).toEqual({
      filled: 1,
      total: ATTRIBUTE_FIELDS.PJ.length,
    });
  });
});
