// Lê JSON da API e converte respostas HTML (erro 500 do Next) em mensagem legível.
export async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const text = await response.text();

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `O servidor retornou erro ${response.status} sem JSON. Confira os logs do servidor e as variaveis do Firebase Admin.`
    );
  }

  if (!response.ok) {
    const message = (data as { error?: string } | null)?.error;
    throw new Error(message || `Erro ${response.status} ao chamar ${input}.`);
  }

  return data as T;
}
