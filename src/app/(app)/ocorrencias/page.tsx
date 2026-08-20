"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { useSessao } from "@/components/SessaoProvider";
import { Campo, Card, Carregando, Etiqueta, Stat, Vazio, toast } from "@/components/ui";
import { IconeWhatsApp } from "@/components/icons";
import {
  atualizarStatusOcorrencia,
  listarCatalogo,
  listarOcorrencias,
  listarUsuarios,
} from "@/lib/api";
import { dataBR, hora, periodo } from "@/lib/format";
import { copiar, formatarMensagem, lerDestinoWhatsApp, linkWhatsApp } from "@/lib/ocorrencia";
import { AppUser, CatalogItem, Occurrence } from "@/lib/types";

const PERIODOS = [
  { chave: "7d", texto: "7 dias" },
  { chave: "mes", texto: "Mês atual" },
  { chave: "3m", texto: "3 meses" },
  { chave: "6m", texto: "6 meses" },
];

export default function Ocorrencias() {
  const { sessao, ehAdmin } = useSessao();
  const [chavePeriodo, setChavePeriodo] = useState("mes");
  const [lista, setLista] = useState<Occurrence[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogItem[]>([]);
  const [usuarios, setUsuarios] = useState<AppUser[]>([]);
  const [motivo, setMotivo] = useState("");
  const [linha, setLinha] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { de, ate } = periodo(chavePeriodo);
    const dados = await listarOcorrencias({
      de,
      ate,
      motivo: motivo || undefined,
      linha: linha || undefined,
      supervisorId: supervisor || undefined,
    });
    setLista(dados);
    setCarregando(false);
  }, [chavePeriodo, motivo, linha, supervisor]);

  useEffect(() => {
    void listarCatalogo().then(setCatalogo);
    if (ehAdmin) void listarUsuarios().then(setUsuarios);
  }, [ehAdmin]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const resumo = useMemo(() => {
    const porMotivo = new Map<string, number>();
    lista.forEach((o) => porMotivo.set(o.reason, (porMotivo.get(o.reason) ?? 0) + 1));
    const topMotivo = [...porMotivo.entries()].sort((a, b) => b[1] - a[1])[0];
    const encaminhadas = lista.filter((o) => o.status === "encaminhada").length;
    return { total: lista.length, topMotivo, encaminhadas };
  }, [lista]);

  const nomeSupervisor = (id: string) =>
    usuarios.find((u) => u.id === id)?.name ?? (id === sessao?.user.id ? sessao.user.name : "—");

  const opcoesMotivo = catalogo.filter((c) => c.kind === "motivo").map((c) => c.code);
  const opcoesLinha = catalogo.filter((c) => c.kind === "linha").map((c) => c.code);

  async function mudarStatus(o: Occurrence, status: Occurrence["status"]) {
    try {
      await atualizarStatusOcorrencia(o.id, status);
      toast("Status atualizado.", "ok");
      await carregar();
    } catch (err) {
      toast((err as Error).message, "erro");
    }
  }

  return (
    <>
      <AppHeader titulo="Ocorrências" />
      <main className="-mt-3 space-y-3 px-4">
        <Link href="/ocorrencias/nova" className="btn no-print">
          + Registrar ocorrência
        </Link>

        <Card titulo="Filtros" className="no-print">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {PERIODOS.map((p) => (
              <button
                key={p.chave}
                onClick={() => setChavePeriodo(p.chave)}
                className={`chip ${
                  chavePeriodo === p.chave ? "bg-brand-700 text-white" : "bg-slate-100 text-ink-soft"
                }`}
              >
                {p.texto}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Motivo">
              <select className="campo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                <option value="">Todos</option>
                {opcoesMotivo.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Campo>
            <Campo label="Linha">
              <select className="campo" value={linha} onChange={(e) => setLinha(e.target.value)}>
                <option value="">Todas</option>
                {opcoesLinha.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </Campo>
            {ehAdmin && (
              <Campo label="Supervisor" className="col-span-2">
                <select
                  className="campo"
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                >
                  <option value="">Todos os supervisores</option>
                  {usuarios
                    .filter((u) => u.role === "supervisor" || u.role === "admin")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </Campo>
            )}
          </div>
        </Card>

        {carregando ? (
          <Carregando />
        ) : (
          <>
            <Card titulo="Resumo do período">
              <div className="grid grid-cols-2 gap-2.5">
                <Stat rotulo="Ocorrências" valor={resumo.total} destaque />
                <Stat rotulo="Encaminhadas" valor={resumo.encaminhadas} />
                <div className="col-span-2 rounded-xl bg-slate-50 p-3">
                  <div className="text-[11.5px] text-ink-soft">Motivo mais frequente</div>
                  <div className="mt-0.5 text-[15px] font-semibold">
                    {resumo.topMotivo ? `${resumo.topMotivo[0]} (${resumo.topMotivo[1]})` : "—"}
                  </div>
                </div>
              </div>
            </Card>

            <Card titulo={`Registros (${lista.length})`}>
              {lista.length === 0 ? (
                <Vazio texto="Nenhuma ocorrência no período." />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {lista.map((o) => {
                    const expandida = aberta === o.id;
                    const texto = o.message ?? formatarMensagem(o);
                    return (
                      <li key={o.id} className="py-3">
                        <button
                          className="flex w-full items-start justify-between gap-3 text-left"
                          onClick={() => setAberta(expandida ? null : o.id)}
                        >
                          <div className="min-w-0">
                            <p className="text-[14px] font-medium">{o.reason}</p>
                            <p className="text-[12px] text-ink-muted">
                              {dataBR(o.date)} · {hora(o.time)} · {o.terminal ?? "—"}
                            </p>
                            <p className="text-[12px] text-ink-muted">
                              Linha {o.line ?? "—"} · veículo {o.bus_code ?? "—"} · motorista{" "}
                              {o.driver_code ?? "—"}
                              {ehAdmin ? ` · ${nomeSupervisor(o.supervisor_id)}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-none flex-col items-end gap-1">
                            <Etiqueta
                              texto={o.status}
                              cor={
                                o.status === "encaminhada"
                                  ? "verde"
                                  : o.status === "arquivada"
                                    ? "slate"
                                    : "azul"
                              }
                            />
                          </div>
                        </button>

                        {expandida && (
                          <div className="mt-3">
                            <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[12.5px] leading-relaxed text-ink-soft">
                              {texto}
                            </pre>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <a
                                href={linkWhatsApp(texto, lerDestinoWhatsApp())}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-claro btn-sm !text-emerald-700"
                              >
                                <IconeWhatsApp className="h-4 w-4" /> WhatsApp
                              </a>
                              <button
                                className="btn-claro btn-sm"
                                onClick={async () => {
                                  const ok = await copiar(texto);
                                  toast(ok ? "Texto copiado." : "Não copiou.", ok ? "ok" : "erro");
                                }}
                              >
                                Copiar
                              </button>
                              {o.status !== "encaminhada" && (
                                <button
                                  className="btn-claro btn-sm"
                                  onClick={() => mudarStatus(o, "encaminhada")}
                                >
                                  Marcar encaminhada
                                </button>
                              )}
                              {ehAdmin && o.status !== "arquivada" && (
                                <button
                                  className="btn-claro btn-sm"
                                  onClick={() => mudarStatus(o, "arquivada")}
                                >
                                  Arquivar
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </>
        )}
      </main>
    </>
  );
}
