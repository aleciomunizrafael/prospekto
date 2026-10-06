"use client";

import type { ComponentProps } from "react";

// Casca cliente da Toolbar (crm-design-system.md, seção 5.2): mudar um <select> envia o formulário
// GET na hora; o campo de busca envia no Enter (nativo). Sem JavaScript, o botão "Filtrar" do
// servidor continua funcionando (decisão D19).
export function ToolbarForm({
  autoSubmit = true,
  onChange,
  ...props
}: ComponentProps<"form"> & { autoSubmit?: boolean }) {
  return (
    <form
      method="get"
      onChange={(event) => {
        onChange?.(event);
        if (autoSubmit && event.target instanceof HTMLSelectElement) {
          event.currentTarget.requestSubmit();
        }
      }}
      {...props}
    />
  );
}
