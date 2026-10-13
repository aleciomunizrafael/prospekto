"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

// Sair: authClient.signOut, depois /entrar e refresh para o layout reler a sessão. Compartilhado
// pelo rodapé do usuário da sidebar (sidebar-user.tsx) e pela folha "Mais" da barra inferior.
export function useSignOut() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  async function signOut() {
    setLeaving(true);
    try {
      await authClient.signOut();
    } finally {
      router.push("/entrar");
      router.refresh();
    }
  }
  return { signOut, leaving };
}
