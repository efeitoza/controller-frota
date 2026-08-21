"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessao } from "./SessaoProvider";
import {
  IconeCombustivel,
  IconeHome,
  IconeJornada,
  IconeManutencao,
  IconeOcorrencia,
  IconeRelatorio,
} from "./icons";

const ITENS = {
  home: { href: "/home", texto: "Home", Icone: IconeHome },
  jornada: { href: "/jornada", texto: "Jornada", Icone: IconeJornada },
  abastecimento: { href: "/abastecimento", texto: "Abastecer", Icone: IconeCombustivel },
  manutencao: { href: "/manutencao", texto: "Manutenção", Icone: IconeManutencao },
  ocorrencias: { href: "/ocorrencias", texto: "Ocorrências", Icone: IconeOcorrencia },
  relatorios: { href: "/relatorios", texto: "Relatórios", Icone: IconeRelatorio },
} as const;

export function BottomNav() {
  const caminho = usePathname();
  const { ehAdmin, ehSupervisor } = useSessao();

  // Cada perfil vê apenas o que é do seu trabalho.
  const chaves: (keyof typeof ITENS)[] = ehSupervisor
    ? ["home", "ocorrencias", "relatorios"]
    : ehAdmin
      ? ["home", "ocorrencias", "abastecimento", "manutencao", "relatorios"]
      : ["home", "jornada", "abastecimento", "manutencao", "relatorios"];

  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="flex">
        {chaves.map((k) => {
          const { href, texto, Icone } = ITENS[k];
          const ativo = caminho.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-3 text-[10.5px] font-medium transition ${
                  ativo ? "text-brand-900" : "text-ink-muted"
                }`}
              >
                <Icone
                  className={`h-[22px] w-[22px] ${ativo ? "text-ouro-400" : ""}`}
                  strokeWidth={ativo ? 2 : 1.6}
                />
                {texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
