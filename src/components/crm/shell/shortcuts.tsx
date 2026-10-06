"use client";

import { useEffect } from "react";

// Atalhos de teclado (crm-design-system.md, decisão D11): só "/" foca a busca. Não dispara com o
// foco em campo de texto, select, conteúdo editável, diálogo ou menu, nem com modificadores.
const EDITABLE = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';
const OVERLAY = '[role="dialog"], [role="alertdialog"], [role="menu"]';

export function Shortcuts() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof Element && (target.closest(EDITABLE) || target.closest(OVERLAY)))
        return;
      const inputs = document.querySelectorAll<HTMLInputElement>(
        'form[role="search"] input[name="q"]',
      );
      const visible = Array.from(inputs).find((input) => input.offsetParent !== null);
      if (!visible) return;
      event.preventDefault();
      visible.focus();
      visible.select();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
  return null;
}
