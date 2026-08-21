import { createClient, SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Cliente administrativo do Supabase — usa a SERVICE ROLE KEY e por isso
 * só pode existir no servidor. Nunca importe este arquivo em componente
 * de tela ("use client"): a chave ignora todas as regras de acesso.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const chaveServico = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const temServico = Boolean(url && chaveServico);

export function clienteAdmin(): SupabaseClient {
  if (!temServico) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.");
  return createClient(url, chaveServico, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export const emailDoLogin = (login: string) =>
  login.includes("@")
    ? login.trim().toLowerCase()
    : `${login.trim().toLowerCase()}@${process.env.NEXT_PUBLIC_LOGIN_DOMAIN || "empresa.com.br"}`;

/**
 * Confere se quem chamou a rota é um gestor autenticado.
 * Devolve o usuário ou null — a rota responde 403 quando vier null.
 */
export async function exigeGestor(req: Request): Promise<User | null> {
  const cabecalho = req.headers.get("authorization") ?? "";
  const token = cabecalho.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const sb = clienteAdmin();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: perfil } = await sb
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  return perfil?.role === "admin" ? data.user : null;
}
