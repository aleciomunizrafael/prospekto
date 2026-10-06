// Iniciais para o Avatar (crm-design-system.md, seção 5.1): primeira letra do primeiro e do último
// nome ("Rafael Teste" -> "RT"); nome único usa as duas primeiras letras ("Daniela" -> "DA").
// Função pura, sem acesso a dados.
export function initials(name: string | null | undefined): string {
  const words = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter((w) => /\p{L}|\p{N}/u.test(w));
  if (words.length === 0) return "?";
  const first = [...words[0]][0] ?? "";
  if (words.length === 1) {
    const second = [...words[0]][1] ?? "";
    return (first + second).toUpperCase();
  }
  const last = [...words[words.length - 1]][0] ?? "";
  return (first + last).toUpperCase();
}
