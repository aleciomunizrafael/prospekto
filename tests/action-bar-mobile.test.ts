// Botão "Mais ações" da ActionBarMobile e do ActionDialogMenu em `size="touch"` renderizados com
// renderToString (padrão de tests/ai-brief-card.test.ts): só com o ícone, `touch` (h-11) com
// `px-3` daria 42 px de largura (16 do svg + 24 de padding + 2 de borda); `min-w-11` garante os
// 44 × 44 px da lista de verificação do design system (seção 9, WCAG 2.5.8). Sem banco.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ActionDialogMenu } from "@/components/crm/project-forms/action-dialog";
import { ActionBarMobile } from "@/components/crm/ui/action-bar-mobile";

vi.mock("sonner", () => ({ toast: { success: () => undefined, error: () => undefined } }));

// Tag de abertura do <button aria-label="…">.
function buttonLabelled(html: string, label: string): string {
  const tag = html.match(new RegExp(`<button[^>]*aria-label="${label}"[^>]*>`))?.[0];
  expect(tag, label).toBeTruthy();
  return tag!;
}

describe("ActionBarMobile: botão 'Mais ações'", () => {
  function render(more: { label: string; href: string }[]) {
    return renderToString(
      createElement(ActionBarMobile, {
        primary: createElement("button", { type: "button" }, "Ligar"),
        more,
      }),
    );
  }

  it("no menu (até quatro itens) tem 44 × 44 px: h-11 e min-w-11", () => {
    const tag = buttonLabelled(render([{ label: "X", href: "/x" }]), "Mais ações");
    expect(tag).toContain("h-11");
    expect(tag).toContain("min-w-11");
  });

  it("na folha inferior (mais de quatro itens) tem o mesmo alvo", () => {
    const more = ["A", "B", "C", "D", "E"].map((label) => ({ label, href: `/${label}` }));
    const tag = buttonLabelled(render(more), "Mais ações");
    expect(tag).toContain("h-11");
    expect(tag).toContain("min-w-11");
  });

  it("sem itens não há botão", () => {
    expect(render([])).not.toContain('aria-label="Mais ações"');
  });
});

describe("ActionDialogMenu: botão '⋯' em size=\"touch\"", () => {
  function render(size: "sm" | "touch") {
    return renderToString(
      // O tipo de ActionDialogMenu exige `children` nas props; a regra react/no-children-prop
      // não vale para createElement em .ts sem JSX.
      // eslint-disable-next-line react/no-children-prop
      createElement(ActionDialogMenu, {
        items: [{ label: "Desvincular" }],
        size,
        menuLabel: "Mais ações para Lead",
        children: createElement("button", { type: "button" }, "Principal"),
      }),
    );
  }

  it("touch: h-11 e min-w-11 (44 × 44 px)", () => {
    const tag = buttonLabelled(render("touch"), "Mais ações para Lead");
    expect(tag).toContain("h-11");
    expect(tag).toContain("min-w-11");
  });

  it("sm: size-11 no celular e size-7 no desktop", () => {
    const tag = buttonLabelled(render("sm"), "Mais ações para Lead");
    expect(tag).toContain("size-11");
    expect(tag).toContain("md:size-7");
  });
});
