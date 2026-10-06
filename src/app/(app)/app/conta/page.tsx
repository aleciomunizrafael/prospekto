import type { Metadata } from "next";
import { FormSection } from "@/components/crm/ui/form-section";
import { KeyValueList } from "@/components/crm/ui/key-value-list";
import { PageHeader } from "@/components/crm/ui/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSession, requireSession } from "@/lib/session";
import { ChangePasswordForm } from "./forms";

export const metadata: Metadata = { title: "Minha conta" };

const ROLE_LABELS = { owner: "Responsável", operator: "Operador(a)" } as const;

// Só "/" é atalho de verdade (decisão D11); Esc, Tab e Enter são o comportamento padrão dos
// diálogos e menus, listados para a pessoa saber que existem.
const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ["/"], action: "Buscar" },
  { keys: ["Esc"], action: "Fechar diálogo ou menu" },
  { keys: ["Tab", "Enter"], action: "Navegar e abrir" },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="crm-code inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-surface-2 px-1.5 text-foreground">
      {children}
    </kbd>
  );
}

export default async function AccountPage() {
  const ctx = await requireSession();
  const session = await getSession();
  const user = session?.user;
  const name = user?.name ?? "";
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="Minha conta" description="Seus dados de acesso ao CRM." />
      <Card>
        <CardHeader>
          <CardTitle>Dados de acesso</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <Avatar name={name || "?"} size="md" className="mt-0.5" />
            <KeyValueList
              className="flex-1"
              columns={3}
              hideEmpty={false}
              items={[
                { label: "Nome", value: name },
                { label: "E-mail", value: user?.email ?? "" },
                { label: "Papel", value: ROLE_LABELS[ctx.role] },
              ]}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Para mudar o nome ou o e-mail, fale com quem administra a conta.
          </p>
        </CardContent>
      </Card>
      <ChangePasswordForm />
      <FormSection
        id="atalhos"
        title="Atalhos de teclado"
        description="Funcionam em qualquer tela do CRM, fora de campos de texto."
        contentClassName="-mx-4 md:-mx-5"
      >
        <Table>
          <caption className="sr-only">Atalhos de teclado do CRM</caption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="w-40 pl-4 md:pl-5">
                Tecla
              </TableHead>
              <TableHead scope="col">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SHORTCUTS.map((s) => (
              <TableRow key={s.action}>
                <TableCell className="pl-4 md:pl-5">
                  <span className="inline-flex items-center gap-1">
                    {s.keys.map((k, i) => (
                      <span key={k} className="inline-flex items-center gap-1">
                        {i > 0 ? (
                          <span className="text-muted-foreground" aria-hidden="true">
                            /
                          </span>
                        ) : null}
                        {i > 0 ? <span className="sr-only">ou</span> : null}
                        <Kbd>{k}</Kbd>
                      </span>
                    ))}
                  </span>
                </TableCell>
                <TableCell>{s.action}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </FormSection>
    </div>
  );
}
