"use client";

import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { useSessao } from "@/components/SessaoProvider";
import { Card, Etiqueta } from "@/components/ui";
import { IconeSair, IconeSeta } from "@/components/icons";
import { resetarDemo } from "@/lib/demo";

function Linha({ href, texto, desc }: { href: string; texto: string; desc: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 py-3 text-left transition active:opacity-70"
    >
      <span>
        <span className="block text-[14px] font-medium text-ink">{texto}</span>
        <span className="block text-[12px] text-ink-muted">{desc}</span>
      </span>
      <IconeSeta className="h-4 w-4 flex-none text-ink-muted" />
    </Link>
  );
}

export default function Mais() {
  const { sessao, ehAdmin, sair, modoDemo, veiculoAtual } = useSessao();

  return (
    <>
      <AppHeader titulo="Mais" voltar="/home" />
      <main className="-mt-3 space-y-3 px-4">
        <Card titulo="Perfil">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-[17px] font-bold text-brand-800">
              {(sessao?.user.name ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold">{sessao?.user.name}</p>
              <p className="truncate text-[12.5px] text-ink-muted">{sessao?.user.email}</p>
            </div>
            <Etiqueta texto={ehAdmin ? "Administrador" : "Condutor"} cor={ehAdmin ? "azul" : "slate"} />
          </div>
          {sessao?.driver && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-[12.5px]">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <span className="block text-ink-muted">Matrícula</span>
                <b>{sessao.driver.registration ?? "—"}</b>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <span className="block text-ink-muted">Veículo</span>
                <b>{veiculoAtual?.plate ?? "—"}</b>
              </div>
            </div>
          )}
        </Card>

        <Card titulo="Controles">
          <div className="divide-y divide-slate-100">
            <Linha href="/mais/epi" texto="EPI" desc="Equipamentos entregues ao condutor" />
            <Linha href="/mais/veiculos" texto="Veículos" desc="Cadastro e histórico da frota" />
            {ehAdmin && (
              <Linha href="/mais/condutores" texto="Condutores" desc="Cadastro da equipe" />
            )}
          </div>
        </Card>

        {modoDemo && (
          <Card titulo="Modo demonstração">
            <p className="mb-3 text-[13px] text-ink-soft">
              O app está usando dados de exemplo salvos neste navegador. Configure as variáveis do
              Supabase para trabalhar com dados reais.
            </p>
            <button
              className="btn-claro"
              onClick={() => {
                resetarDemo();
                location.reload();
              }}
            >
              Restaurar dados de exemplo
            </button>
          </Card>
        )}

        <button className="btn-claro !text-rose-600" onClick={() => void sair()}>
          <IconeSair className="h-4 w-4" /> Sair da conta
        </button>

        <p className="pb-2 text-center text-[11.5px] text-ink-muted">Controller · versão 1.0</p>
      </main>
    </>
  );
}
