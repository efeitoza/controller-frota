"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, Carregando, Stat, Vazio } from "./ui";
import { listarOcorrencias } from "@/lib/api";
import { dataBR, hora, periodo } from "@/lib/format";
import { Occurrence } from "@/lib/types";

/** Home do perfil Supervisão: resumo do mês e acesso rápido ao registro. */
export function HomeSupervisao() {
  const [lista, setLista] = useState<Occurrence[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const { de, ate } = periodo("mes");
    void listarOcorrencias({ de, ate }).then((d) => {
      setLista(d);
      setCarregando(false);
    });
  }, []);

  const resumo = useMemo(() => {
    const porMotivo = new Map<string, number>();
    lista.forEach((o) => porMotivo.set(o.reason, (porMotivo.get(o.reason) ?? 0) + 1));
    return {
      total: lista.length,
      pendentes: lista.filter((o) => o.status === "registrada").length,
      topMotivo: [...porMotivo.entries()].sort((a, b) => b[1] - a[1])[0],
      linhas: new Set(lista.map((o) => o.line).filter(Boolean)).size,
    };
  }, [lista]);

  if (carregando) return <Carregando />;

  return (
    <>
      <Link href="/ocorrencias/nova" className="btn">
        + Registrar ocorrência
      </Link>

      <Card titulo="Resumo do mês">
        <div className="grid grid-cols-2 gap-2.5">
          <Stat rotulo="Ocorrências" valor={resumo.total} destaque />
          <Stat rotulo="Não encaminhadas" valor={resumo.pendentes} />
          <Stat rotulo="Linhas envolvidas" valor={resumo.linhas} />
          <Stat
            rotulo="Motivo mais comum"
            valor={resumo.topMotivo ? resumo.topMotivo[1] : "—"}
            sub={resumo.topMotivo ? resumo.topMotivo[0] : undefined}
          />
        </div>
      </Card>

      <Card
        titulo="Últimas ocorrências"
        acao={
          <Link href="/ocorrencias" className="text-[13px] font-semibold text-brand-700">
            ver todas
          </Link>
        }
      >
        {lista.length === 0 ? (
          <Vazio texto="Nenhuma ocorrência registrada este mês." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {lista.slice(0, 5).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium">{o.reason}</p>
                  <p className="text-[12px] text-ink-muted">
                    {dataBR(o.date)} · {hora(o.time)} · linha {o.line ?? "—"} · motorista{" "}
                    {o.driver_code ?? "—"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
