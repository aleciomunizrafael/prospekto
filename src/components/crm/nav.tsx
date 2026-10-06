"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/app", label: "Hoje", exact: true },
  { href: "/app/leads", label: "Leads" },
  { href: "/app/organizacoes", label: "Organizações" },
  { href: "/app/projetos", label: "Projetos" },
  { href: "/app/aportes", label: "Aportes" },
  { href: "/app/exportar", label: "Exportar" },
] as const;

export function CrmNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const accountActive = pathname.startsWith("/app/conta");

  async function signOut() {
    setLeaving(true);
    await authClient.signOut();
    router.push("/entrar");
    router.refresh();
  }

  return (
    <nav
      aria-label="Navegação do CRM"
      className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-sm"
    >
      <Link href="/app" className="mr-2 font-semibold">
        Prospekto CRM
      </Link>
      {LINKS.map((link) => {
        const active =
          "exact" in link && link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-2 py-1 hover:bg-muted",
              active ? "bg-muted font-medium" : "text-muted-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
      <Link
        href="/app/conta"
        aria-current={accountActive ? "page" : undefined}
        className={cn(
          "ml-auto rounded-md px-2 py-1 hover:bg-muted",
          accountActive ? "bg-muted font-medium" : "text-muted-foreground",
        )}
      >
        <span className="hidden sm:inline">{userName || "Conta"}</span>
        <span className="sm:hidden">Conta</span>
      </Link>
      <Button type="button" variant="outline" size="sm" onClick={signOut} disabled={leaving}>
        {leaving ? "Saindo..." : "Sair"}
      </Button>
    </nav>
  );
}
