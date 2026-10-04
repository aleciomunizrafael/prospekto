// Ids de campo levam o id do formulário como prefixo: /contadores tem dois formulários com campos de
// mesmo nome (AccountantForm e AccountantWebinarForm) e rótulo, aria-describedby e os links do resumo
// de erros precisam apontar para o campo certo. Render estático no servidor (sem DOM).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fieldIds } from "@/components/site/form/field";
import { AccountantForm } from "@/components/site/lead-forms/accountant-form";
import { AccountantWebinarForm } from "@/components/site/lead-forms/accountant-webinar-form";

function ids(html: string): string[] {
  return [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
}

describe("ids dos campos por formulário", () => {
  it("dois formulários na mesma página não repetem id", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(AccountantForm, { titleId: "diagnostico-carteira" }),
        createElement(AccountantWebinarForm, { titleId: "webinar" }),
      ),
    );
    const all = ids(html);
    const duplicates = all.filter((id, i) => all.indexOf(id) !== i);
    expect(duplicates).toEqual([]);
    expect(all).toContain("accountant-campo-email");
    expect(all).toContain("accountant_webinar-campo-email");
    // Rótulo e campo ligados pelo id com prefixo.
    expect(html).toContain('for="accountant-campo-email"');
    expect(html).toContain('for="accountant_webinar-campo-email"');
  });

  it("fieldIds usa o prefixo quando há formulário e cai no id simples fora dele", () => {
    expect(fieldIds("email", "accountant")).toEqual({
      id: "accountant-campo-email",
      helpId: "accountant-campo-email-ajuda",
      errorId: "accountant-campo-email-erro",
    });
    expect(fieldIds("email").id).toBe("campo-email");
  });
});
