"use client";

import Link from "next/link";
import { ReactElement, SVGProps } from "react";
import { Card } from "./ui";
import { useSessao } from "./SessaoProvider";
import {
  IconeCombustivel,
  IconeEpi,
  IconeEquipe,
  IconeJornada,
  IconeManutencao,
  IconeMoto,
  IconeNovo,
  IconeOcorrencia,
  IconeOperacao,
  IconeRelatorio,
} from "./icons";

interface Atalho {
  href: string;
  texto: string;
  Icone: (p: SVGProps<SVGSVGElement>) => ReactElement;
  etiqueta?: string;
}

/** Grade de acesso rápido da Home, no lugar do antigo resumo do mês. */
export function Atalhos({ destaques = {} }: { destaques?: Record<string, string> }) {
  const { ehAdmin, ehSupervisor } = useSessao();

  const itens: Atalho[] = ehSupervisor
    ? [
        { href: "/ocorrencias/nova", texto: "Nova ocorrência", Icone: IconeNovo, etiqueta: "Registrar" },
        { href: "/ocorrencias", texto: "Ocorrências", Icone: IconeOcorrencia },
        { href: "/mais/operacao", texto: "Operação", Icone: IconeOperacao },
        { href: "/relatorios", texto: "Relatórios", Icone: IconeRelatorio },
      ]
    : ehAdmin
      ? [
          { href: "/ocorrencias", texto: "Ocorrências", Icone: IconeOcorrencia },
          { href: "/abastecimento", texto: "Abastecer", Icone: IconeCombustivel },
          { href: "/manutencao", texto: "Manutenção", Icone: IconeManutencao },
          { href: "/mais/veiculos", texto: "Veículos", Icone: IconeMoto },
          { href: "/mais/condutores", texto: "Condutores", Icone: IconeEquipe },
          { href: "/relatorios", texto: "Relatórios", Icone: IconeRelatorio },
        ]
      : [
          { href: "/jornada", texto: "Jornada", Icone: IconeJornada },
          { href: "/abastecimento", texto: "Abastecer", Icone: IconeCombustivel },
          { href: "/manutencao", texto: "Manutenção", Icone: IconeManutencao },
          { href: "/mais/epi", texto: "EPI", Icone: IconeEpi },
          { href: "/mais/veiculos", texto: "Meu veículo", Icone: IconeMoto },
          { href: "/relatorios", texto: "Relatórios", Icone: IconeRelatorio },
        ];

  return (
    <Card titulo="O que você quer fazer">
      <div className="grid grid-cols-2 gap-2.5">
        {itens.map(({ href, texto, Icone, etiqueta: fixa }) => {
          const etiqueta = destaques[href] ?? fixa;
          return (
          <Link
            key={href}
            href={href}
            className="relative flex flex-col items-center justify-center gap-1.5 rounded-2xl
                       border border-slate-200 px-3 py-3.5 text-center transition
                       active:scale-[.98] active:bg-slate-50"
          >
            {etiqueta && (
              <span className="absolute -top-2.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                {etiqueta}
              </span>
            )}
            <Icone className="h-6 w-6 text-ouro-500" strokeWidth={1.6} />
            <span className="text-[13px] text-ink">{texto}</span>
          </Link>
          );
        })}
      </div>
    </Card>
  );
}
