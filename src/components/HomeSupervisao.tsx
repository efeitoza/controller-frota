"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, Carregando, Vazio } from "./ui";
import { Atalhos } from "./Atalhos";
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

  if (carregando) return <Carregando />;

  return (
    <>
      <Atalhos />

      <Card
        titulo="Últimas ocorrências"
        acao={
          <Link href="/ocorrencias" className="text-[13px] font-semibold text-brand-900">
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
