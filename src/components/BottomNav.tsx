"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconeCombustivel,
  IconeHome,
  IconeJornada,
  IconeManutencao,
  IconeRelatorio,
} from "./icons";

const itens = [
  { href: "/home", texto: "Home", Icone: IconeHome },
  { href: "/jornada", texto: "Jornada", Icone: IconeJornada },
  { href: "/abastecimento", texto: "Abastecer", Icone: IconeCombustivel },
  { href: "/manutencao", texto: "Manutenção", Icone: IconeManutencao },
  { href: "/relatorios", texto: "Relatórios", Icone: IconeRelatorio },
];

export function BottomNav() {
  const caminho = usePathname();
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="flex">
        {itens.map(({ href, texto, Icone }) => {
          const ativo = caminho.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium transition ${
                  ativo ? "text-brand-700" : "text-ink-muted"
                }`}
              >
                <Icone className="h-[22px] w-[22px]" strokeWidth={ativo ? 2.1 : 1.7} />
                {texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
