// ActivityForm (src/components/crm/forms/activity-form.tsx) depois de registrar: o botão
// "Registrar" fica realmente `disabled` enquanto a action roda (regra do design system, seção de
// ação bloqueada) e o navegador solta o foco para o body. O efeito de sucesso zera o formulário e
// devolve o foco a "O que aconteceu", o primeiro campo, nunca desabilitado (WCAG 2.4.3).
// Verificação manual com Playwright: depois do toast "Contato registrado.", o activeElement é
// TEXTAREA#f-body tanto na ficha do lead quanto na da organização.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function sourceOf(file: string): string {
  return readFileSync(path.join(process.cwd(), "src/components/crm/forms", file), "utf8");
}

// O efeito que roda quando a action devolve `ok`: do guard ao fim do `useEffect`.
function successEffect(): string {
  const source = sourceOf("activity-form.tsx");
  const start = source.indexOf('if (state.status !== "ok") return;');
  expect(start, "guard do efeito de sucesso").toBeGreaterThan(-1);
  const end = source.indexOf("}, [state]);", start);
  expect(end, "fim do efeito de sucesso").toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("ActivityForm depois de registrar", () => {
  it('zera o formulário e devolve o foco a "O que aconteceu"', () => {
    const effect = successEffect();
    const reset = effect.indexOf("form.reset()");
    const focus = effect.indexOf('fieldOf(form, "body")?.focus()');
    expect(reset, "form.reset()").toBeGreaterThan(-1);
    expect(focus, "foco no corpo depois do reset").toBeGreaterThan(reset);
  });

  it("o SubmitButton continua realmente `disabled` enquanto envia (não só aria-disabled)", () => {
    const source = sourceOf("submit-button.tsx");
    expect(source).toContain("disabled={pending || disabled}");
  });
});
