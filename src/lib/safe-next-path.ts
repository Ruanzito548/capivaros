// Aceita apenas caminhos internos, para evitar redirecionamento aberto apos o login.
export function getSafeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }

  return value;
}
