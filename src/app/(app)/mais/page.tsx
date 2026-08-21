"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { useSessao } from "@/components/SessaoProvider";
import { Campo, Card, Etiqueta, toast } from "@/components/ui";
import { lerDestinoWhatsApp, salvarDestinoWhatsApp } from "@/lib/ocorrencia";
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
  const { sessao, ehAdmin, ehSupervisor, sair, modoDemo, veiculoAtual } = useSessao();
  const [zap, setZap] = useState("");

  useEffect(() => {
    setZap(lerDestinoWhatsApp());
  }, []);

  return (
    <>
      <AppHeader titulo="Mais" voltar="/home" />
      <main className="relative -mt-7 space-y-3 rounded-t-[28px] bg-[#f4f6f9] px-4 pb-3 pt-5">
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
            {(ehSupervisor || ehAdmin) && (
              <>
                <Linha
                  href="/ocorrencias"
                  texto="Ocorrências"
                  desc="Registros disciplinares da supervisão"
                />
                <Linha
                  href="/mais/operacao"
                  texto="Operação"
                  desc="Linhas, terminais, veículos, motoristas e motivos"
                />
              </>
            )}
            {!ehSupervisor && (
              <>
                <Linha href="/mais/epi" texto="EPI" desc="Equipamentos entregues ao condutor" />
                <Linha
                  href="/mais/veiculos"
                  texto="Veículos"
                  desc="Cadastro e histórico da frota"
                />
                <Linha href="/jornada" texto="Jornada" desc="Iniciar ou finalizar o dia" />
              </>
            )}
            {ehAdmin && (
              <Linha href="/mais/condutores" texto="Condutores" desc="Cadastro da equipe" />
            )}
          </div>
        </Card>

        {(ehSupervisor || ehAdmin) && (
          <Card titulo="Envio no WhatsApp">
            <Campo label="Número de destino (opcional)">
              <input
                className="campo"
                value={zap}
                onChange={(e) => setZap(e.target.value)}
                placeholder="55819XXXXXXXX"
                inputMode="numeric"
              />
            </Campo>
            <p className="mt-2 text-[12px] text-ink-muted">
              Deixe em branco para escolher o grupo na hora do envio. O WhatsApp não permite
              postar direto em um grupo por link — com o número preenchido, o app abre a conversa
              daquele contato já com o texto.
            </p>
            <button
              className="btn-claro mt-2"
              onClick={() => {
                salvarDestinoWhatsApp(zap.trim());
                toast("Preferência salva neste aparelho.", "ok");
              }}
            >
              Salvar
            </button>
          </Card>
        )}

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
