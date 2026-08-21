"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { entrar } from "@/lib/api";
import { temSupabase } from "@/lib/supabase";
import { useSessao } from "@/components/SessaoProvider";
import { Campo, toast } from "@/components/ui";

export default function Login() {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const { sessao, carregando, recarregar } = useSessao();
  const router = useRouter();

  useEffect(() => {
    if (!carregando && sessao) router.replace("/home");
  }, [sessao, carregando, router]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await entrar(login, senha);
      await recarregar();
      router.replace("/home");
    } catch (err) {
      toast((err as Error).message, "erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center bg-brand-900 px-6 py-10">
      <div className="mb-8 text-center text-white">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold">
          C
        </div>
        <h1 className="text-2xl font-semibold">Controller</h1>
        <p className="mt-1 text-[13.5px] text-brand-200">Gestão de condutores e frota</p>
      </div>

      <form onSubmit={enviar} className="card space-y-3">
        <Campo label="Login">
          <input
            className="campo"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="antonio.campos"
            autoCapitalize="off"
            autoCorrect="off"
            required
          />
        </Campo>
        <Campo label="Senha">
          <input
            className="campo"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••"
            required={temSupabase}
          />
        </Campo>
        <button className="btn" disabled={enviando}>
          {enviando ? "Aguarde..." : "Entrar"}
        </button>
      </form>

      <p className="mt-4 text-center text-[12.5px] text-brand-200">
        Não tem acesso? Peça ao gestor da frota — só ele cria e redefine senhas.
      </p>

      {!temSupabase && (
        <p className="mt-5 rounded-xl bg-white/10 p-3 text-center text-[12.5px] leading-relaxed text-brand-100">
          <b>Modo demonstração.</b> Sem Supabase configurado, o app usa dados de exemplo.
          Entre com <b>antonio.campos</b> (condutor) ou <b>marina.souza</b> (administrador) —
          qualquer senha.
        </p>
      )}
    </main>
  );
}
