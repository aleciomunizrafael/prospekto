"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Callout } from "@/components/crm/ui/callout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const ERROR_ID = "login-erro";

// Formulário de entrada (crm-design-system.md, seção 7.1): campos de 44 px, mostrar/ocultar senha
// com `aria-pressed`, erro em Callout que recebe o foco ao aparecer e botão de largura total.
export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Conta as tentativas com erro: a mesma mensagem duas vezes seguidas ainda recebe o foco.
  const [attempt, setAttempt] = useState(0);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (error) document.getElementById(ERROR_ID)?.focus();
  }, [error, attempt]);

  function fail(message: string) {
    setError(message);
    setAttempt((n) => n + 1);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      fail("Informe o e-mail e a senha.");
      return;
    }
    setPending(true);
    try {
      const { error: signInError } = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (signInError) {
        fail(
          signInError.status === 401 || signInError.status === 400 || signInError.status === 403
            ? "E-mail ou senha incorretos. Confira os dados e tente de novo."
            : "Não foi possível entrar agora. Tente de novo em instantes.",
        );
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      fail("Sem conexão com o servidor. Verifique a internet e tente de novo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-required="true"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={error ? ERROR_ID : undefined}
          aria-invalid={error ? true : undefined}
          className="h-11"
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password">Senha</Label>
          <Link
            href="/redefinir-senha"
            className="rounded-sm text-sm text-primary underline-offset-2 hover:underline"
          >
            Esqueci a senha
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-required="true"
            minLength={12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby={error ? ERROR_ID : undefined}
            aria-invalid={error ? true : undefined}
            className="h-11 pr-11"
          />
          <button
            type="button"
            aria-pressed={showPassword}
            aria-label="Mostrar senha"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground transition-colors duration-120 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      {error ? (
        <Callout tone="danger" role="alert" id={ERROR_ID} tabIndex={-1}>
          {error}
        </Callout>
      ) : null}
      <Button type="submit" size="touch" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Entrando…
          </>
        ) : (
          "Entrar"
        )}
      </Button>
    </form>
  );
}
