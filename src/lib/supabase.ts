"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Quando não há credenciais o app roda em modo demonstração. */
export const temSupabase = Boolean(url && key);

export const dominioLogin = process.env.NEXT_PUBLIC_LOGIN_DOMAIN || "empresa.com.br";

let cliente: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!temSupabase) {
    throw new Error(
      "Supabase não configurado. Preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  if (!cliente) {
    cliente = createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return cliente;
}

/** Monta o e-mail a partir do login curto do condutor. */
export const emailDoLogin = (login: string) =>
  login.includes("@") ? login.trim().toLowerCase() : `${login.trim().toLowerCase()}@${dominioLogin}`;
